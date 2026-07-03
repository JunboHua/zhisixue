<template>
  <view class="container">
    <!-- 顶部知识点头 -->
    <view class="chat-header">
      <text class="knowledge-title">{{ currentKnowledgePoint }}</text>
      <text class="session-status" v-if="isStreaming">● 思考中</text>
      <text class="session-status done" v-else>✓ 就绪</text>
    </view>

    <!-- 消息列表 -->
    <scroll-view class="msg-list" scroll-y :scroll-into-view="'msg-' + (messages.length - 1)" scroll-with-animation>
      <view v-for="(msg, i) in messages" :key="i" :id="'msg-' + i"
        :class="['msg-item', msg.role === 'user' ? 'msg-user' : 'msg-agent']"
      >
        <view class="msg-avatar">
          <text>{{ msg.role === 'user' ? '👤' : '🤖' }}</text>
        </view>
        <view class="msg-bubble">
          <text class="msg-text">{{ msg.content }}</text>
          <text class="msg-cursor" v-if="msg.streaming">|</text>

          <!-- 提示按钮 -->
          <view class="hint-btn" v-if="msg.role === 'agent' && msg.hint && !msg.streaming" @click="showHint = !showHint">
            <text>💡 {{ showHint ? '收起提示' : '查看提示' }}</text>
          </view>
          <view class="hint-content" v-if="showHint && msg.hint">
            <text>{{ msg.hint }}</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 输入框 -->
    <view class="input-area">
      <textarea class="chat-input" v-model="userInput" placeholder="输入你的思考..."
        :disabled="isStreaming" :maxlength="1000" confirm-type="send"
        @confirm="sendMessage"
      />
      <view class="send-btn" :class="{ disabled: !userInput.trim() || isStreaming }" @click="sendMessage">
        <text>发送</text>
      </view>
    </view>

    <!-- 完成弹窗 -->
    <view class="completion-modal" v-if="showCompletion">
      <view class="modal-content">
        <view class="modal-icon">🎉</view>
        <text class="modal-title">学习完成！</text>
        <text class="modal-desc">恭喜完成「{{ currentKnowledgePoint }}」</text>
        <view class="btn btn-primary btn-block" @click="viewReport">查看学习报告</view>
        <view class="btn btn-secondary btn-block mt-md" @click="goBack">返回首页</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { agentApi } from '@/utils/api'

interface Message {
  role: 'user' | 'agent'
  content: string
  streaming?: boolean
  hint?: string
}

const currentKnowledgePoint = ref('')
const messages = ref<Message[]>([])
const userInput = ref('')
const isStreaming = ref(false)
const showHint = ref(false)
const sessionId = ref('')
const showCompletion = ref(false)

// 初始化：读参数，启动 Agent
const pages = getCurrentPages()
const currentPage = pages[pages.length - 1] as any
const options = currentPage.$page?.options || currentPage.options || {}

const resourceId = options.resourceId
const pointId = options.pointId
const pointTitle = decodeURIComponent(options.pointTitle || '知识点')

if (resourceId && pointId && pointTitle) {
  currentKnowledgePoint.value = pointTitle
  initSession(resourceId, pointId, pointTitle)
}

async function initSession(resourceId: string, pointId: string, pointTitle: string) {
  isStreaming.value = true
  try {
    const res = await agentApi.start({ resourceId, knowledgePointId: pointId, knowledgePointTitle: pointTitle })
    sessionId.value = res.sessionId || ''

    // 用流式效果展示首条回复
    const msg: Message = { role: 'agent', content: '', streaming: true, hint: '' }
    messages.value.push(msg)
    await typewriterEffect(msg, res.reply || '请开始思考...')
    msg.streaming = false

    // 从回复中提取 hint（如果存在）
    // （简化处理：Agent start 不含 hint，后续 chat 含）
  } catch (e: any) {
    messages.value.push({ role: 'agent', content: '启动失败：' + (e.message || '请重试') })
  } finally {
    isStreaming.value = false
  }
}

async function sendMessage() {
  const text = userInput.value.trim()
  if (!text || isStreaming.value) return

  userInput.value = ''
  messages.value.push({ role: 'user', content: text })

  isStreaming.value = true
  const agentMsg: Message = { role: 'agent', content: '', streaming: true }
  messages.value.push(agentMsg)

  if (sessionId.value) {
    // 优先使用流式
    try {
      agentApi.streamChat(
        sessionId.value,
        text,
        (token: string) => {
          agentMsg.content += token
        },
        (completed: boolean) => {
          agentMsg.streaming = false
          isStreaming.value = false
          if (completed) {
            setTimeout(() => { showCompletion.value = true }, 1500)
          }
        },
        (err: string) => {
          // 流式失败，回退到普通接口
          fallbackChat(agentMsg)
        }
      )
    } catch {
      fallbackChat(agentMsg)
    }
  } else {
    // 无 sessionId，回退
    agentMsg.content = '会话未初始化，请返回重新开始'
    agentMsg.streaming = false
    isStreaming.value = false
  }
}

async function fallbackChat(agentMsg: Message) {
  try {
    const res = await agentApi.chat({ sessionId: sessionId.value, message: agentMsg.content || '继续' })
    agentMsg.content = res.reply || '请继续思考...'
    if (res.isCompleted) {
      setTimeout(() => { showCompletion.value = true }, 1500)
    }
  } catch (e: any) {
    agentMsg.content = '回复失败：' + (e.message || '网络错误')
  } finally {
    agentMsg.streaming = false
    isStreaming.value = false
  }
}

// 打字机效果
function typewriterEffect(msg: Message, text: string, speed = 30): Promise<void> {
  return new Promise(resolve => {
    let i = 0
    const timer = setInterval(() => {
      if (i >= text.length) {
        clearInterval(timer)
        resolve()
        return
      }
      // 标点后多停一下
      const char = text[i]
      msg.content += char
      i++
      if ('。！？；\n'.includes(char)) {
        // 已处理，继续
      }
    }, speed)
  })
}

function viewReport() {
  uni.navigateTo({ url: `/pages/learning/report?sessionId=${sessionId.value}` })
}

function goBack() {
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style lang="scss">
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: $bg-secondary;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  background: linear-gradient(135deg, $primary-color, #7C3AED);
}

.knowledge-title {
  font-size: 28rpx;
  color: #fff;
  font-weight: bold;
}

.session-status {
  font-size: 22rpx;
  color: rgba(255,255,255,0.7);
  &.done { color: #A7F3D0; }
}

.msg-list {
  flex: 1;
  padding: 20rpx 16rpx;
  overflow-y: auto;
}

.msg-item {
  display: flex;
  margin-bottom: 24rpx;

  &.msg-user {
    flex-direction: row-reverse;
    .msg-avatar { margin-left: 12rpx; margin-right: 0; }
    .msg-bubble {
      background: $primary-color;
      color: #fff;
      border-radius: 20rpx 4rpx 20rpx 20rpx;
    }
  }
}

.msg-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: $bg-primary;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  flex-shrink: 0;
  margin-right: 12rpx;
}

.msg-bubble {
  max-width: 75%;
  padding: 20rpx 24rpx;
  background: $bg-primary;
  border-radius: 4rpx 20rpx 20rpx 20rpx;
  box-shadow: $shadow-sm;
}

.msg-text {
  font-size: 28rpx;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-all;
}

.msg-cursor {
  animation: blink 0.8s infinite;
  color: $primary-color;
  font-weight: bold;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.hint-btn {
  margin-top: 16rpx;
  padding: 12rpx 16rpx;
  background: #FEF3C7;
  border-radius: $radius-md;
  font-size: 24rpx;
  color: #92400E;
}

.hint-content {
  margin-top: 12rpx;
  padding: 16rpx;
  background: #FFFBEB;
  border-radius: $radius-md;
  font-size: 26rpx;
  line-height: 1.6;
}

.input-area {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background: $bg-primary;
  border-top: 1rpx solid $border-color;
}

.chat-input {
  flex: 1;
  height: 72rpx;
  padding: 12rpx 20rpx;
  border: 2rpx solid $border-color;
  border-radius: 36rpx;
  font-size: 28rpx;
  background: $bg-secondary;
}

.send-btn {
  padding: 14rpx 28rpx;
  background: $primary-color;
  color: #fff;
  border-radius: 36rpx;
  font-size: 28rpx;

  &.disabled {
    opacity: 0.4;
  }
}

.completion-modal {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal-content {
  background: $bg-primary;
  border-radius: $radius-lg;
  padding: 48rpx 32rpx;
  width: 80%;
  max-width: 560rpx;
  text-align: center;
}

.modal-icon { font-size: 100rpx; margin-bottom: 20rpx; }
.modal-title { font-size: 36rpx; font-weight: bold; display: block; margin-bottom: 12rpx; }
.modal-desc { font-size: 26rpx; color: $text-secondary; display: block; margin-bottom: 32rpx; }

.btn {
  padding: 20rpx;
  border-radius: $radius-md;
  font-size: 30rpx;
  &.btn-primary { background: $primary-color; color: #fff; }
  &.btn-secondary { background: $bg-secondary; color: $primary-color; }
  &.btn-block { width: 100%; display: block; }
}

.mt-md { margin-top: 20rpx; }
</style>
