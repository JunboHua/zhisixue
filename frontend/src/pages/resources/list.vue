<template>
  <view class="container">
    <view class="header-actions">
      <view class="btn btn-primary btn-block" @click="goToUpload">
        <text>📤 上传新资料</text>
      </view>
    </view>

    <view class="empty-state" v-if="resources.length === 0 && !isLoading">
      <view class="empty-icon">📚</view>
      <text class="empty-title">暂无学习资料</text>
      <text class="empty-desc">上传课本、笔记或错题，开始苏格拉底式学习之旅</text>
      <view class="btn btn-primary btn-block mt-lg" @click="goToUpload">
        <text>立即上传</text>
      </view>
    </view>

    <view class="resource-list" v-else>
      <view 
        class="resource-item" 
        v-for="resource in resources" 
        :key="resource._id"
        @click="viewResource(resource)"
      >
        <view class="resource-icon" :class="resource.type">
          {{ getTypeIcon(resource.type) }}
        </view>
        <view class="resource-info">
          <text class="resource-title">{{ resource.title }}</text>
          <text class="resource-meta">
            {{ getTypeLabel(resource.type) }} · {{ resource.knowledgePoints?.length || 0 }}个知识点
          </text>
        </view>
        <view class="resource-status" :class="resource.status">
          {{ getStatusLabel(resource.status) }}
        </view>
      </view>
    </view>

    <view class="knowledge-section" v-if="selectedResource && selectedResource.knowledgePoints?.length">
      <view class="section-header">
        <text class="section-title">{{ selectedResource.title }} - 知识点</text>
        <text class="close-btn" @click="selectedResource = null">✕</text>
      </view>
      <view class="knowledge-tree">
        <view 
          class="knowledge-item"
          v-for="point in selectedResource.knowledgePoints"
          :key="point.id"
          @click="startLearning(selectedResource._id, point)"
        >
          <view class="knowledge-level" :style="{ paddingLeft: `${(point.level - 1) * 24}rpx` }">
            <view class="knowledge-bullet"></view>
            <text class="knowledge-title">{{ point.title }}</text>
            <text class="start-btn">开始学习 →</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { resourceApi } from '@/utils/api'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const resources = ref<any[]>([])
const isLoading = ref(false)
const selectedResource = ref<any>(null)

onMounted(async () => {
  userStore.initFromStorage()
  await loadResources()
})

async function loadResources() {
  isLoading.value = true
  try {
    userStore.initFromStorage()
    console.log('当前Token状态:', userStore.token ? '已设置' : '未设置')
    console.log('用户信息:', userStore.userInfo)

    if (!userStore.token) {
      uni.showToast({ title: '请先登录', icon: 'none' })
      setTimeout(() => {
        uni.navigateTo({ url: '/pages/auth/login' })
      }, 1500)
      return
    }

    const res = await resourceApi.list()
    resources.value = res.resources || []
  } catch (error) {
    console.error('加载资料失败:', error)
    uni.showToast({ title: error instanceof Error ? error.message : '加载失败', icon: 'none' })
  } finally {
    isLoading.value = false
  }
}

function getTypeIcon(type: string) {
  const icons: Record<string, string> = {
    pdf: '📄',
    word: '📝',
    image: '🖼️',
    text: '📄',
    ppt: '📊'
  }
  return icons[type] || '📄'
}

function getTypeLabel(type: string) {
  const labels: Record<string, string> = {
    pdf: 'PDF文档',
    word: 'Word文档',
    image: '图片',
    text: '文本',
    ppt: 'PPT'
  }
  return labels[type] || '其他'
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    uploading: '上传中',
    processing: '解析中',
    completed: '已完成',
    failed: '失败'
  }
  return labels[status] || status
}

function goToUpload() {
  uni.navigateTo({ url: '/pages/resources/upload' })
}

function viewResource(resource: any) {
  if (resource.status === 'completed') {
    selectedResource.value = resource
  }
}

function startLearning(resourceId: string, point: any) {
  uni.navigateTo({ 
    url: `/pages/learning/study?resourceId=${resourceId}&pointId=${point.id}&pointTitle=${encodeURIComponent(point.title)}`
  })
}
</script>

<style lang="scss">
.container {
  padding-bottom: 120rpx;
}

.header-actions {
  padding: 24rpx;
}

.empty-state {
  text-align: center;
  padding: 80rpx 32rpx;
}

.empty-icon {
  font-size: 100rpx;
  margin-bottom: 24rpx;
}

.empty-title {
  font-size: 32rpx;
  font-weight: bold;
  color: $text-primary;
  display: block;
  margin-bottom: 12rpx;
}

.empty-desc {
  font-size: 26rpx;
  color: $text-secondary;
  display: block;
  line-height: 1.5;
}

.resource-list {
  padding: 0 24rpx;
}

.resource-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: $bg-primary;
  padding: 24rpx;
  border-radius: $radius-lg;
  margin-bottom: 16rpx;
  box-shadow: $shadow-sm;
  
  &:active {
    opacity: 0.8;
  }
}

.resource-icon {
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
  border-radius: $radius-md;
  
  &.pdf { background: #FEF2F2; }
  &.word { background: #EFF6FF; }
  &.image { background: #FEFCE8; }
  &.text { background: #F0FDF4; }
}

.resource-info {
  flex: 1;
}

.resource-title {
  font-size: 28rpx;
  font-weight: 500;
  color: $text-primary;
  display: block;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.resource-meta {
  font-size: 24rpx;
  color: $text-muted;
}

.resource-status {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  
  &.completed {
    background: #D1FAE5;
    color: $success-color;
  }
  
  &.processing {
    background: #FEF3C7;
    color: $warning-color;
  }
  
  &.failed {
    background: #FEE2E2;
    color: $error-color;
  }
}

.knowledge-section {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: $bg-primary;
  border-radius: $radius-lg $radius-lg 0 0;
  padding: 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.1);
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: $text-primary;
}

.close-btn {
  font-size: 32rpx;
  color: $text-muted;
  padding: 8rpx;
}

.knowledge-tree {
  max-height: 50vh;
  overflow-y: auto;
}

.knowledge-item {
  padding: 16rpx 0;
  border-bottom: 1rpx solid $border-color;
  
  &:last-child {
    border-bottom: none;
  }
}

.knowledge-level {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.knowledge-bullet {
  width: 12rpx;
  height: 12rpx;
  background: $primary-color;
  border-radius: 50%;
  flex-shrink: 0;
}

.knowledge-title {
  flex: 1;
  font-size: 28rpx;
  color: $text-primary;
}

.start-btn {
  font-size: 24rpx;
  color: $primary-color;
}
</style>