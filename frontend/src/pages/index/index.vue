<template>
  <view class="container">
    <view class="header">
      <view class="logo">
        <view class="logo-icon">智</view>
        <view class="logo-text">
          <text class="app-name">问乎</text>
          <text class="app-slogan">AI 启发式问答</text>
        </view>
      </view>
    </view>

    <view class="hero-section" v-if="!isLoggedIn">
      <view class="hero-content">
        <text class="hero-title">让AI引导你思考</text>
        <text class="hero-desc">颠覆传统学习模式，通过启发式提问，自主构建知识体系</text>
        <view class="hero-buttons">
          <view class="btn btn-primary btn-block" @click="goToLogin">立即体验</view>
          <view class="btn btn-outline btn-block mt-md" @click="goToRegister">免费注册</view>
        </view>
      </view>
    </view>

    <view class="main-content" v-else>
      <view class="welcome-card">
        <text class="welcome-text">你好，{{ userInfo?.username }} 👋</text>
        <text class="welcome-sub">今天也要加油学习哦！</text>
      </view>

      <view class="stats-card">
        <view class="stat-item">
          <text class="stat-value">{{ learningStats.completedPoints }}</text>
          <text class="stat-label">已掌握知识点</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ learningStats.totalTime }}</text>
          <text class="stat-label">累计学习时长(分)</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ learningStats.weakCount }}</text>
          <text class="stat-label">待加强知识点</text>
        </view>
      </view>

      <view class="quick-actions">
        <text class="section-title">快速开始</text>
        <view class="action-grid">
          <view class="action-item" @click="startQuickLearn">
            <view class="action-icon learn">📚</view>
            <text class="action-text">快速学习</text>
          </view>
          <view class="action-item" @click="goToUpload">
            <view class="action-icon upload">📤</view>
            <text class="action-text">上传资料</text>
          </view>
          <view class="action-item" @click="viewReports">
            <view class="action-icon report">📊</view>
            <text class="action-text">学习报告</text>
          </view>
          <view class="action-item" @click="goToResources">
            <view class="action-icon resource">📁</view>
            <text class="action-text">我的资料</text>
          </view>
        </view>
      </view>

      <view class="recent-section" v-if="recentSessions.length > 0">
        <view class="section-header">
          <text class="section-title">最近学习</text>
          <text class="section-more" @click="goToSessions">查看全部</text>
        </view>
        <view class="session-list">
          <view 
            class="session-item" 
            v-for="session in recentSessions" 
            :key="session._id"
            @click="continueSession(session)"
          >
            <view class="session-info">
              <text class="session-title">{{ session.knowledgePointTitle }}</text>
              <text class="session-status" :class="session.status">
                {{ session.status === 'completed' ? '已完成' : '学习中' }}
              </text>
            </view>
            <text class="session-time">{{ formatTime(session.createdAt) }}</text>
          </view>
        </view>
      </view>

      <view class="feature-section">
        <text class="section-title">核心特色</text>
        <view class="feature-list">
          <view class="feature-item">
            <view class="feature-icon">💡</view>
            <view class="feature-content">
              <text class="feature-title">启发式提问</text>
              <text class="feature-desc">苏格拉底式教学法，引导你自主思考</text>
            </view>
          </view>
          <view class="feature-item">
            <view class="feature-icon">🎯</view>
            <view class="feature-content">
              <text class="feature-title">个性化学习</text>
              <text class="feature-desc">基于学习画像，定制专属学习路径</text>
            </view>
          </view>
          <view class="feature-item">
            <view class="feature-icon">🔄</view>
            <view class="feature-content">
              <text class="feature-title">智能追问</text>
              <text class="feature-desc">答错不直接给答案，引导自我发现</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { learningApi } from '@/utils/api'

const userStore = useUserStore()
const recentSessions = ref<any[]>([])

const isLoggedIn = computed(() => userStore.isLoggedIn())
const userInfo = computed(() => userStore.userInfo)

const learningStats = computed(() => {
  const profile = userStore.userInfo?.learningProfile || {}
  return {
    completedPoints: profile.completedPoints || 0,
    totalTime: profile.totalLearningTime || 0,
    weakCount: profile.weakAreas?.length || 0
  }
})

onMounted(() => {
  userStore.initFromStorage()
  if (isLoggedIn.value) {
    loadRecentSessions()
  }
})

async function loadRecentSessions() {
  try {
    const res = await learningApi.sessions()
    recentSessions.value = res.sessions?.slice(0, 5) || []
  } catch (error) {
    console.error('加载学习记录失败:', error)
  }
}

function goToLogin() {
  uni.navigateTo({ url: '/pages/auth/login' })
}

function goToRegister() {
  uni.navigateTo({ url: '/pages/auth/register' })
}

function goToUpload() {
  uni.navigateTo({ url: '/pages/resources/upload' })
}

function goToResources() {
  uni.switchTab({ url: '/pages/resources/list' })
}

function viewReports() {
  uni.navigateTo({ url: '/pages/learning/report' })
}

function goToSessions() {
  uni.navigateTo({ url: '/pages/learning/report' })
}

function startQuickLearn() {
  uni.showModal({
    title: '快速学习',
    content: '请先上传学习资料或从已有资料中选择知识点开始学习',
    showCancel: false,
    success: () => {
      uni.navigateTo({ url: '/pages/resources/list' })
    }
  })
}

function continueSession(session: any) {
  if (session.status === 'in_progress') {
    uni.navigateTo({ url: `/pages/learning/study?sessionId=${session._id}` })
  }
}

function formatTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  return `${date.getMonth() + 1}/${date.getDate()}`
}
</script>

<style lang="scss">
.container {
  padding-bottom: 120rpx;
}

.header {
  padding: 32rpx 24rpx;
}

.logo {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.logo-icon {
  width: 80rpx;
  height: 80rpx;
  background: linear-gradient(135deg, $primary-color, #7C3AED);
  border-radius: $radius-lg;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  color: #fff;
  font-weight: bold;
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.app-name {
  font-size: 36rpx;
  font-weight: bold;
  color: $text-primary;
}

.app-slogan {
  font-size: 22rpx;
  color: $text-secondary;
  margin-top: 4rpx;
}

.hero-section {
  padding: 60rpx 24rpx;
  background: linear-gradient(135deg, $primary-color, #7C3AED);
  margin: 0 24rpx;
  border-radius: $radius-lg;
  margin-bottom: 32rpx;
}

.hero-content {
  text-align: center;
}

.hero-title {
  font-size: 44rpx;
  font-weight: bold;
  color: #fff;
  display: block;
  margin-bottom: 16rpx;
}

.hero-desc {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.85);
  display: block;
  margin-bottom: 40rpx;
}

.hero-buttons {
  padding: 0 40rpx;
}

.main-content {
  padding-top: 16rpx;
}

.welcome-card {
  background: linear-gradient(135deg, $primary-color, #7C3AED);
  padding: 32rpx;
  border-radius: $radius-lg;
  margin-bottom: 24rpx;
}

.welcome-text {
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
  display: block;
}

.welcome-sub {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 8rpx;
  display: block;
}

.stats-card {
  display: flex;
  justify-content: space-around;
  padding: 32rpx;
  background: $bg-primary;
  border-radius: $radius-lg;
  margin-bottom: 24rpx;
  box-shadow: $shadow-sm;
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
  color: $text-secondary;
  margin-top: 8rpx;
  display: block;
}

.quick-actions {
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: $text-primary;
  margin-bottom: 20rpx;
  display: block;
}

.action-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
}

.action-item {
  background: $bg-primary;
  padding: 24rpx 16rpx;
  border-radius: $radius-md;
  text-align: center;
  box-shadow: $shadow-sm;
  
  &:active {
    opacity: 0.8;
  }
}

.action-icon {
  font-size: 48rpx;
  margin-bottom: 12rpx;
  
  &.learn { background: #EEF2FF; }
  &.upload { background: #FEF3C7; }
  &.report { background: #D1FAE5; }
  &.resource { background: #FCE7F3; }
}

.action-text {
  font-size: 24rpx;
  color: $text-primary;
}

.recent-section {
  margin-bottom: 24rpx;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.section-more {
  font-size: 26rpx;
  color: $primary-color;
}

.session-list {
  background: $bg-primary;
  border-radius: $radius-lg;
  overflow: hidden;
  box-shadow: $shadow-sm;
}

.session-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx;
  border-bottom: 1rpx solid $border-color;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:active {
    background: $bg-secondary;
  }
}

.session-info {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.session-title {
  font-size: 28rpx;
  color: $text-primary;
}

.session-status {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 20rpx;
  
  &.completed {
    background: #D1FAE5;
    color: $success-color;
  }
  
  &.in_progress {
    background: #FEF3C7;
    color: $warning-color;
  }
}

.session-time {
  font-size: 24rpx;
  color: $text-muted;
}

.feature-section {
  margin-top: 16rpx;
}

.feature-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  background: $bg-primary;
  padding: 24rpx;
  border-radius: $radius-lg;
  box-shadow: $shadow-sm;
}

.feature-icon {
  font-size: 40rpx;
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $primary-light;
  border-radius: $radius-md;
}

.feature-content {
  flex: 1;
}

.feature-title {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-primary;
  display: block;
}

.feature-desc {
  font-size: 24rpx;
  color: $text-secondary;
  margin-top: 4rpx;
  display: block;
}
</style>