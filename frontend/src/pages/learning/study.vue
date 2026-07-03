<template>
  <view class="container">
    <view class="header-info">
      <text class="knowledge-title">{{ currentKnowledgePoint }}</text>
      <view class="progress-bar">
        <view class="progress-fill" :style="{ width: progressPercent + '%' }"></view>
      </view>
      <text class="progress-text">第 {{ currentRound }} / {{ totalRounds }} 轮</text>
    </view>

    <view class="question-card" v-if="currentQuestion">
      <view class="question-header">
        <text class="question-label">🤔 苏格拉底提问</text>
      </view>
      <text class="question-content">{{ currentQuestion }}</text>

      <view class="hint-section" v-if="currentHint || currentBriefAnswer">
        <view class="hint-toggle" @click="toggleHint">
          <text class="hint-icon">{{ showHint ? '🙈' : '💡' }}</text>
          <text class="hint-text">{{ showHint ? '收起提示' : '需要提示？点击查看' }}</text>
        </view>
        <view class="hint-content" v-if="showHint && currentHint">
          <text class="hint-label">💡 解题思路提示：</text>
          <text class="hint-value">{{ currentHint }}</text>
        </view>
        <view class="hint-content brief-answer" v-if="showHint && currentBriefAnswer">
          <text class="hint-label">📝 简要答案（供核对）：</text>
          <text class="hint-value">{{ currentBriefAnswer }}</text>
        </view>
      </view>
    </view>

    <view class="answer-section">
      <textarea 
        class="answer-input" 
        v-model="userAnswer" 
        placeholder="请输入你的思考和答案..."
        :disabled="isSubmitting"
      ></textarea>
      <view class="char-count">{{ userAnswer.length }} / 1000</view>
    </view>

    <view class="analysis-card" v-if="lastAnalysis">
      <view class="analysis-header">
        <text class="analysis-label">💡 分析结果</text>
        <text class="analysis-status" :class="getCorrectnessClass(lastAnalysis.correctness)">
          {{ getCorrectnessLabel(lastAnalysis.correctness) }}
        </text>
      </view>
      <text class="analysis-content">{{ lastAnalysis.explanation }}</text>
    </view>

    <view class="btn btn-primary btn-block" :class="{ loading: isSubmitting }" @click="submitAnswer">
      <text v-if="isSubmitting">思考中...</text>
      <text v-else>{{ isCompleted ? '查看报告' : '提交答案' }}</text>
    </view>

    <view class="completion-modal" v-if="showCompletion">
      <view class="modal-content">
        <view class="modal-icon">🎉</view>
        <text class="modal-title">学习完成！</text>
        <text class="modal-desc">恭喜你完成了「{{ currentKnowledgePoint }}」的学习</text>
        <view class="modal-stats">
          <view class="stat-item">
            <text class="stat-value">{{ correctCount }}</text>
            <text class="stat-label">正确次数</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ totalAnswers }}</text>
            <text class="stat-label">总回答次数</text>
          </view>
        </view>
        <view class="btn btn-primary btn-block" @click="viewReport">查看学习报告</view>
        <view class="btn btn-secondary btn-block mt-md" @click="goBack">返回首页</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { learningApi } from '@/utils/api'

const currentKnowledgePoint = ref('')
const currentQuestion = ref('')
const currentHint = ref('')
const currentBriefAnswer = ref('')
const showHint = ref(false)
const userAnswer = ref('')
const isSubmitting = ref(false)
const lastAnalysis = ref<any>(null)
const sessionId = ref('')
const currentRound = ref(1)
const totalRounds = ref(3)
const correctCount = ref(0)
const totalAnswers = ref(0)
const isCompleted = ref(false)
const showCompletion = ref(false)

const progressPercent = computed(() => {
  return Math.round((currentRound.value / totalRounds.value) * 100)
})

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage.$page?.options || currentPage.options || {}
  
  const resourceId = options.resourceId
  const pointId = options.pointId
  const pointTitle = decodeURIComponent(options.pointTitle || '')
  
  if (resourceId && pointId && pointTitle) {
    currentKnowledgePoint.value = pointTitle
    startSession(resourceId, pointId, pointTitle)
  } else {
    uni.showToast({ title: '参数错误', icon: 'none' })
  }
})

async function startSession(resourceId: string, pointId: string, pointTitle: string) {
  isSubmitting.value = true
  
  try {
    const res = await learningApi.start({
      resourceId,
      knowledgePointId: pointId,
      knowledgePointTitle: pointTitle
    })
    
    sessionId.value = res.sessionId || ''
    currentQuestion.value = res.question || '请开始思考这个问题...'
    currentHint.value = res.hint || ''
    currentBriefAnswer.value = res.briefAnswer || ''
    showHint.value = false
  } catch (error: any) {
    uni.showToast({ title: error.message || '启动会话失败', icon: 'none' })
  } finally {
    isSubmitting.value = false
  }
}

async function submitAnswer() {
  if (!userAnswer.value.trim()) {
    uni.showToast({ title: '请输入你的答案', icon: 'none' })
    return
  }

  if (isCompleted.value) {
    viewReport()
    return
  }

  isSubmitting.value = true
  totalAnswers.value++
  
  try {
    const res = await learningApi.answer({
      sessionId: sessionId.value,
      userAnswer: userAnswer.value.trim()
    })

    lastAnalysis.value = res.analysis
    
    if (res.analysis?.correctness === '正确') {
      correctCount.value++
    }

    if (res.isCompleted) {
      isCompleted.value = true
      currentQuestion.value = '学习已完成！'
      currentHint.value = ''
      currentBriefAnswer.value = ''
      setTimeout(() => {
        showCompletion.value = true
      }, 1000)
    } else {
      currentQuestion.value = res.nextQuestion || '请继续思考...'
      currentHint.value = res.hint || ''
      currentBriefAnswer.value = res.briefAnswer || ''
      showHint.value = false
      currentRound.value++
    }
    
    userAnswer.value = ''
  } catch (error: any) {
    uni.showToast({ title: error.message || '提交失败', icon: 'none' })
  } finally {
    isSubmitting.value = false
  }
}

function toggleHint() {
  showHint.value = !showHint.value
}

function getCorrectnessLabel(correctness: string) {
  const labels: Record<string, string> = {
    correct: '回答正确 ✓',
    '正确': '回答正确 ✓',
    partial: '部分正确',
    '部分正确': '部分正确',
    wrong: '需要继续思考',
    '错误': '需要继续思考'
  }
  return labels[correctness] || correctness
}

function getCorrectnessClass(correctness: string) {
  const classMap: Record<string, string> = {
    '正确': 'correct',
    '部分正确': 'partial',
    '错误': 'wrong'
  }
  return classMap[correctness] || ''
}

function viewReport() {
  uni.navigateTo({ 
    url: `/pages/learning/report?sessionId=${sessionId.value}` 
  })
}

function goBack() {
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<style lang="scss">
.container {
  padding: 24rpx;
  padding-bottom: 160rpx;
}

.header-info {
  background: linear-gradient(135deg, $primary-color, #7C3AED);
  padding: 32rpx;
  border-radius: $radius-lg;
  margin-bottom: 24rpx;
}

.knowledge-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #fff;
  display: block;
  margin-bottom: 20rpx;
}

.progress-bar {
  height: 12rpx;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 6rpx;
  overflow: hidden;
  margin-bottom: 12rpx;
}

.progress-fill {
  height: 100%;
  background: #fff;
  border-radius: 6rpx;
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.85);
}

.question-card {
  background: $bg-primary;
  padding: 32rpx;
  border-radius: $radius-lg;
  margin-bottom: 24rpx;
  box-shadow: $shadow-sm;
}

.question-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.question-label {
  font-size: 26rpx;
  color: $primary-color;
  font-weight: 500;
}

.question-content {
  font-size: 32rpx;
  color: $text-primary;
  line-height: 1.8;
}

.hint-section {
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 2rpx dashed $border-color;
}

.hint-toggle {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 24rpx;
  background: linear-gradient(135deg, #FEF3C7, #FDE68A);
  border-radius: $radius-md;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:active {
    transform: scale(0.98);
  }
}

.hint-icon {
  font-size: 32rpx;
}

.hint-text {
  font-size: 26rpx;
  color: #92400E;
  font-weight: 500;
}

.hint-content {
  margin-top: 20rpx;
  padding: 20rpx;
  background: #FFFBEB;
  border-radius: $radius-md;
  border: 2rpx solid #FDE68A;
  
  &.brief-answer {
    margin-top: 16rpx;
    background: #ECFDF5;
    border-color: #A7F3D0;
  }
}

.hint-label {
  display: block;
  font-size: 24rpx;
  color: $text-secondary;
  margin-bottom: 12rpx;
  font-weight: 500;
}

.hint-value {
  font-size: 28rpx;
  color: $text-primary;
  line-height: 1.7;
}

.answer-section {
  background: $bg-primary;
  padding: 24rpx;
  border-radius: $radius-lg;
  margin-bottom: 24rpx;
  box-shadow: $shadow-sm;
}

.answer-input {
  width: 100%;
  height: 240rpx;
  padding: 20rpx;
  border: 2rpx solid $border-color;
  border-radius: $radius-md;
  font-size: 28rpx;
  line-height: 1.6;
  box-sizing: border-box;
  
  &:focus {
    border-color: $primary-color;
  }
}

.char-count {
  text-align: right;
  font-size: 24rpx;
  color: $text-muted;
  margin-top: 12rpx;
}

.analysis-card {
  background: $bg-primary;
  padding: 24rpx;
  border-radius: $radius-lg;
  margin-bottom: 24rpx;
  box-shadow: $shadow-sm;
  border-left: 6rpx solid $primary-color;
}

.analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.analysis-label {
  font-size: 26rpx;
  color: $primary-color;
  font-weight: 500;
}

.analysis-status {
  font-size: 24rpx;
  padding: 4rpx 12rpx;
  border-radius: 16rpx;
  
  &.correct {
    background: #D1FAE5;
    color: $success-color;
  }
  
  &.partial {
    background: #FEF3C7;
    color: $warning-color;
  }
  
  &.wrong {
    background: #FEE2E2;
    color: $error-color;
  }
}

.analysis-content {
  font-size: 28rpx;
  color: $text-secondary;
  line-height: 1.6;
}

.btn {
  position: fixed;
  bottom: 24rpx;
  left: 24rpx;
  right: 24rpx;
  
  &.loading {
    opacity: 0.7;
  }
}

.completion-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
  z-index: 100;
}

.modal-content {
  background: $bg-primary;
  border-radius: $radius-lg;
  padding: 48rpx 32rpx;
  width: 100%;
  max-width: 560rpx;
  text-align: center;
}

.modal-icon {
  font-size: 100rpx;
  margin-bottom: 20rpx;
}

.modal-title {
  font-size: 36rpx;
  font-weight: bold;
  color: $text-primary;
  display: block;
  margin-bottom: 12rpx;
}

.modal-desc {
  font-size: 26rpx;
  color: $text-secondary;
  display: block;
  margin-bottom: 32rpx;
}

.modal-stats {
  display: flex;
  justify-content: center;
  gap: 60rpx;
  margin-bottom: 32rpx;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 48rpx;
  font-weight: bold;
  color: $primary-color;
  display: block;
}

.stat-label {
  font-size: 24rpx;
  color: $text-muted;
}
</style>