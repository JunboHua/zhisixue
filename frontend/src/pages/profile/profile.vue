<template>
  <view class="container">
    <view class="profile-header" v-if="isLoggedIn">
      <view class="avatar">
        <text class="avatar-icon">👤</text>
      </view>
      <view class="user-info">
        <text class="username">{{ userInfo?.username }}</text>
        <text class="email">{{ userInfo?.email }}</text>
      </view>
    </view>

    <view class="login-prompt" v-else>
      <view class="prompt-icon">🔐</view>
      <text class="prompt-title">请先登录</text>
      <text class="prompt-desc">登录后即可开始苏格拉底式学习之旅</text>
      <view class="btn btn-primary btn-block mt-lg" @click="goToLogin">立即登录</view>
    </view>

    <view class="menu-section" v-if="isLoggedIn">
      <view class="menu-list">
        <view class="menu-item" @click="goToReport">
          <view class="menu-icon">📊</view>
          <text class="menu-text">学习报告</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @click="goToResources">
          <view class="menu-icon">📚</view>
          <text class="menu-text">我的资料</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @click="goToSettings">
          <view class="menu-icon">⚙️</view>
          <text class="menu-text">设置</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @click="showAbout">
          <view class="menu-icon">ℹ️</view>
          <text class="menu-text">关于我们</text>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item logout" @click="handleLogout">
          <view class="menu-icon">🚪</view>
          <text class="menu-text">退出登录</text>
          <text class="menu-arrow">›</text>
        </view>
      </view>
    </view>

    <view class="stats-section" v-if="isLoggedIn">
      <text class="section-title">学习统计</text>
      <view class="stats-grid">
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
    </view>

    <view class="feature-section">
      <text class="section-title">核心特色</text>
      <view class="feature-grid">
        <view class="feature-item">
          <view class="feature-icon">💡</view>
          <text class="feature-title">启发式提问</text>
          <text class="feature-desc">苏格拉底式教学法</text>
        </view>
        <view class="feature-item">
          <view class="feature-icon">🎯</view>
          <text class="feature-title">个性化学习</text>
          <text class="feature-desc">定制专属学习路径</text>
        </view>
        <view class="feature-item">
          <view class="feature-icon">🔄</view>
          <text class="feature-title">智能追问</text>
          <text class="feature-desc">引导自我发现</text>
        </view>
        <view class="feature-item">
          <view class="feature-icon">📈</view>
          <text class="feature-title">学习分析</text>
          <text class="feature-desc">数据驱动进步</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

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

function goToLogin() {
  uni.navigateTo({ url: '/pages/auth/login' })
}

function goToReport() {
  uni.navigateTo({ url: '/pages/learning/report' })
}

function goToResources() {
  uni.switchTab({ url: '/pages/resources/list' })
}

function goToSettings() {
  uni.showToast({ title: '设置功能开发中', icon: 'none' })
}

function showAbout() {
  uni.showModal({
    title: '关于问乎',
    content: '问乎是一款基于苏格拉底式教学法的AI学习助手，通过启发式提问引导用户自主思考，构建知识体系。',
    showCancel: false
  })
}

function handleLogout() {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        userStore.logout()
        uni.showToast({ title: '退出成功', icon: 'success' })
        setTimeout(() => {
          uni.switchTab({ url: '/pages/index/index' })
        }, 1500)
      }
    }
  })
}
</script>

<style lang="scss">
.container {
  padding-bottom: 120rpx;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 24rpx;
  background: linear-gradient(135deg, $primary-color, #7C3AED);
  padding: 40rpx 32rpx;
  border-radius: $radius-lg;
  margin-bottom: 24rpx;
}

.avatar {
  width: 100rpx;
  height: 100rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-icon {
  font-size: 48rpx;
}

.user-info {
  flex: 1;
}

.username {
  font-size: 36rpx;
  font-weight: bold;
  color: #fff;
  display: block;
  margin-bottom: 8rpx;
}

.email {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.85);
}

.login-prompt {
  background: $bg-primary;
  padding: 48rpx 32rpx;
  border-radius: $radius-lg;
  text-align: center;
  margin-bottom: 24rpx;
}

.prompt-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.prompt-title {
  font-size: 32rpx;
  font-weight: bold;
  color: $text-primary;
  display: block;
  margin-bottom: 12rpx;
}

.prompt-desc {
  font-size: 26rpx;
  color: $text-secondary;
  display: block;
}

.menu-section {
  margin-bottom: 24rpx;
}

.menu-list {
  background: $bg-primary;
  border-radius: $radius-lg;
  overflow: hidden;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 28rpx 24rpx;
  border-bottom: 1rpx solid $border-color;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:active {
    background: $bg-secondary;
  }
  
  &.logout {
    color: $error-color;
  }
}

.menu-icon {
  font-size: 36rpx;
}

.menu-text {
  flex: 1;
  font-size: 30rpx;
  color: $text-primary;
}

.menu-arrow {
  font-size: 36rpx;
  color: $text-muted;
}

.stats-section {
  background: $bg-primary;
  padding: 24rpx;
  border-radius: $radius-lg;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: bold;
  color: $text-primary;
  display: block;
  margin-bottom: 20rpx;
}

.stats-grid {
  display: flex;
  justify-content: space-around;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 40rpx;
  font-weight: bold;
  color: $primary-color;
  display: block;
}

.stat-label {
  font-size: 24rpx;
  color: $text-muted;
  margin-top: 8rpx;
  display: block;
}

.feature-section {
  background: $bg-primary;
  padding: 24rpx;
  border-radius: $radius-lg;
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24rpx;
}

.feature-item {
  text-align: center;
  padding: 20rpx;
}

.feature-icon {
  font-size: 48rpx;
  margin-bottom: 12rpx;
}

.feature-title {
  font-size: 28rpx;
  font-weight: 500;
  color: $text-primary;
  display: block;
  margin-bottom: 8rpx;
}

.feature-desc {
  font-size: 24rpx;
  color: $text-muted;
}
</style>