<template>
  <view class="container">
    <view class="report-header">
      <view class="report-icon">📊</view>
      <text class="report-title">学习复盘报告</text>
      <text class="report-date">{{ currentDate }}</text>
    </view>

    <view class="stats-overview">
      <view class="stat-card">
        <text class="stat-value">{{ totalSessions }}</text>
        <text class="stat-label">学习会话</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ completedPoints }}</text>
        <text class="stat-label">掌握知识点</text>
      </view>
      <view class="stat-card">
        <text class="stat-value">{{ totalTime }}</text>
        <text class="stat-label">学习时长(分)</text>
      </view>
    </view>

    <view class="section-card">
      <text class="section-title">📚 最近学习记录</text>
      <view class="session-list" v-if="recentSessions.length > 0">
        <view class="session-item" v-for="session in recentSessions" :key="session._id">
          <view class="session-info">
            <text class="session-title">{{ session.knowledgePointTitle }}</text>
            <text class="session-meta">{{ formatTime(session.createdAt) }} · {{ session.duration }}分钟</text>
          </view>
          <text class="session-status" :class="session.status">
            {{ session.status === 'completed' ? '已完成' : '学习中' }}
          </text>
        </view>
      </view>
      <view class="empty-text" v-else>
        <text>暂无学习记录</text>
      </view>
    </view>

    <view class="section-card">
      <text class="section-title">🎯 知识点掌握情况</text>
      <view class="mastery-list" v-if="masteryData.length > 0">
        <view class="mastery-item" v-for="item in masteryData" :key="item.name">
          <text class="mastery-name">{{ item.name }}</text>
          <view class="mastery-bar-wrap">
            <view class="mastery-bar" :class="getMasteryClass(item.value)" :style="{ width: item.value + '%' }"></view>
          </view>
          <text class="mastery-value">{{ item.value }}%</text>
        </view>
      </view>
      <view class="empty-text" v-else>
        <text>暂无掌握数据</text>
      </view>
    </view>

    <view class="section-card">
      <text class="section-title">💪 待加强知识点</text>
      <view class="weak-list" v-if="weakAreas.length > 0">
        <view class="weak-item" v-for="(area, index) in weakAreas" :key="index">
          <view class="weak-bullet"></view>
          <text class="weak-name">{{ area }}</text>
        </view>
      </view>
      <view class="empty-text" v-else>
        <text>暂无需要加强的知识点，继续保持！</text>
      </view>
    </view>

    <view class="btn btn-primary btn-block" @click="goToLearn">
      <text>开始学习</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { learningApi } from '@/utils/api'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const recentSessions = ref<any[]>([])

const currentDate = computed(() => {
  const date = new Date()
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
})

const totalSessions = computed(() => recentSessions.value.length)

const completedPoints = computed(() => {
  return userStore.userInfo?.learningProfile?.completedPoints || 0
})

const totalTime = computed(() => {
  return userStore.userInfo?.learningProfile?.totalLearningTime || 0
})

const masteryData = computed(() => {
  const points = userStore.userInfo?.learningProfile?.knowledgePoints || {}
  return Object.entries(points).map(([key, value]: [string, any]) => ({
    name: key.length > 10 ? key.substring(0, 10) + '...' : key,
    value: value.mastery || 0
  }))
})

const weakAreas = computed(() => {
  return userStore.userInfo?.learningProfile?.weakAreas || []
})

onMounted(() => {
  loadSessions()
})

async function loadSessions() {
  try {
    const res = await learningApi.sessions()
    recentSessions.value = res.sessions || []
  } catch (error) {
    console.error('加载学习记录失败:', error)
  }
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function getMasteryClass(value: number) {
  if (value >= 80) return 'high'
  if (value >= 50) return 'medium'
  return 'low'
}

function goToLearn() {
  uni.navigateTo({ url: '/pages/resources/list' })
}
</script>

<style lang="scss">
.container {
  padding-bottom: 120rpx;
}

.report-header {
  background: linear-gradient(135deg, $primary-color, #7C3AED);
  padding: 40rpx 32rpx;
  border-radius: $radius-lg;
  margin-bottom: 24rpx;
  text-align: center;
}

.report-icon {
  font-size: 64rpx;
  margin-bottom: 16rpx;
}

.report-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
  display: block;
  margin-bottom: 8rpx;
}

.report-date {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.85);
}

.stats-overview {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.stat-card {
  flex: 1;
  background: $bg-primary;
  padding: 24rpx 16rpx;
  border-radius: $radius-md;
  text-align: center;
  box-shadow: $shadow-sm;
}

.stat-value {
  font-size: 40rpx;
  font-weight: bold;
  color: $primary-color;
  display: block;
}

.stat-label {
  font-size: 22rpx;
  color: $text-muted;
  margin-top: 4rpx;
  display: block;
}

.section-card {
  background: $bg-primary;
  padding: 24rpx;
  border-radius: $radius-lg;
  margin-bottom: 24rpx;
  box-shadow: $shadow-sm;
}

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: $text-primary;
  display: block;
  margin-bottom: 20rpx;
}

.session-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx;
  background: $bg-secondary;
  border-radius: $radius-md;
}

.session-info {
  flex: 1;
}

.session-title {
  font-size: 28rpx;
  color: $text-primary;
  display: block;
  margin-bottom: 4rpx;
}

.session-meta {
  font-size: 24rpx;
  color: $text-muted;
}

.session-status {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 16rpx;
  
  &.completed {
    background: #D1FAE5;
    color: $success-color;
  }
  
  &.in_progress {
    background: #FEF3C7;
    color: $warning-color;
  }
}

.empty-text {
  text-align: center;
  padding: 40rpx;
  color: $text-muted;
  font-size: 26rpx;
}

.mastery-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.mastery-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.mastery-name {
  width: 150rpx;
  font-size: 26rpx;
  color: $text-primary;
  flex-shrink: 0;
}

.mastery-bar-wrap {
  flex: 1;
  height: 16rpx;
  background: $bg-secondary;
  border-radius: 8rpx;
  overflow: hidden;
}

.mastery-bar {
  height: 100%;
  border-radius: 8rpx;
  transition: width 0.3s ease;
  
  &.high { background: $success-color; }
  &.medium { background: $warning-color; }
  &.low { background: $error-color; }
}

.mastery-value {
  width: 80rpx;
  font-size: 26rpx;
  color: $text-secondary;
  text-align: right;
}

.weak-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.weak-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.weak-bullet {
  width: 12rpx;
  height: 12rpx;
  background: $warning-color;
  border-radius: 50%;
}

.weak-name {
  font-size: 26rpx;
  color: $text-primary;
}

.btn {
  position: fixed;
  bottom: 24rpx;
  left: 24rpx;
  right: 24rpx;
}
</style>