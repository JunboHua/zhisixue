<template>
  <view class="container">
    <view class="register-card">
      <view class="logo-section">
        <view class="logo-icon">智</view>
        <text class="app-title">问乎</text>
        <text class="app-subtitle">AI 启发式问答</text>
      </view>

      <view class="form-section">
        <view class="input-group">
          <text class="label">用户名</text>
          <input 
            class="input" 
            v-model="form.username" 
            placeholder="请输入用户名"
            :class="{ error: errors.username }"
          />
          <text class="error-text" v-if="errors.username">{{ errors.username }}</text>
        </view>

        <view class="input-group">
          <text class="label">邮箱</text>
          <input 
            class="input" 
            v-model="form.email" 
            type="email" 
            placeholder="请输入邮箱"
            :class="{ error: errors.email }"
          />
          <text class="error-text" v-if="errors.email">{{ errors.email }}</text>
        </view>

        <view class="input-group">
          <text class="label">密码</text>
          <input 
            class="input" 
            v-model="form.password" 
            type="password" 
            placeholder="请输入密码"
            :class="{ error: errors.password }"
          />
          <text class="error-text" v-if="errors.password">{{ errors.password }}</text>
        </view>

        <view class="input-group">
          <text class="label">确认密码</text>
          <input 
            class="input" 
            v-model="form.confirmPassword" 
            type="password" 
            placeholder="请再次输入密码"
            :class="{ error: errors.confirmPassword }"
          />
          <text class="error-text" v-if="errors.confirmPassword">{{ errors.confirmPassword }}</text>
        </view>

        <view class="btn btn-primary btn-block mt-lg" :class="{ loading: isLoading }" @click="handleRegister">
          <text v-if="isLoading">注册中...</text>
          <text v-else>注册</text>
        </view>
      </view>

      <view class="link-section">
        <text class="link-text" @click="goToLogin">已有账号？立即登录</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useUserStore } from '@/stores/user'
import { authApi } from '@/utils/api'

const userStore = useUserStore()
const isLoading = ref(false)

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const errors = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: ''
})

function validate() {
  errors.username = ''
  errors.email = ''
  errors.password = ''
  errors.confirmPassword = ''
  
  if (!form.username.trim()) {
    errors.username = '请输入用户名'
    return false
  }
  
  if (form.username.length < 3) {
    errors.username = '用户名至少需要3位'
    return false
  }
  
  if (!form.email.trim()) {
    errors.email = '请输入邮箱'
    return false
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(form.email)) {
    errors.email = '请输入有效的邮箱地址'
    return false
  }
  
  if (!form.password) {
    errors.password = '请输入密码'
    return false
  }
  
  if (form.password.length < 6) {
    errors.password = '密码至少需要6位'
    return false
  }
  
  if (!form.confirmPassword) {
    errors.confirmPassword = '请再次输入密码'
    return false
  }
  
  if (form.password !== form.confirmPassword) {
    errors.confirmPassword = '两次输入的密码不一致'
    return false
  }
  
  return true
}

async function handleRegister() {
  if (!validate()) return
  
  isLoading.value = true
  
  try {
    const res = await authApi.register({
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password
    })
    
    if (res.token && res.user) {
      userStore.login(res.token, res.user)
      uni.showToast({ title: '注册成功', icon: 'success' })
      setTimeout(() => {
        uni.switchTab({ url: '/pages/index/index' })
      }, 1500)
    }
  } catch (error: any) {
    uni.showToast({ title: error.message || '注册失败', icon: 'none' })
  } finally {
    isLoading.value = false
  }
}

function goToLogin() {
  uni.navigateBack()
}
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
}

.register-card {
  width: 100%;
  max-width: 600rpx;
  background: $bg-primary;
  border-radius: $radius-lg;
  padding: 48rpx 32rpx;
  box-shadow: $shadow-lg;
}

.logo-section {
  text-align: center;
  margin-bottom: 40rpx;
}

.logo-icon {
  width: 100rpx;
  height: 100rpx;
  background: linear-gradient(135deg, $primary-color, #7C3AED);
  border-radius: $radius-lg;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  color: #fff;
  font-weight: bold;
  margin: 0 auto 20rpx;
}

.app-title {
  font-size: 40rpx;
  font-weight: bold;
  color: $text-primary;
  display: block;
}

.app-subtitle {
  font-size: 24rpx;
  color: $text-secondary;
  margin-top: 8rpx;
  display: block;
}

.form-section {
  margin-bottom: 32rpx;
}

.btn.loading {
  opacity: 0.7;
}

.link-section {
  text-align: center;
}

.link-text {
  font-size: 26rpx;
  color: $primary-color;
  
  &:active {
    opacity: 0.7;
  }
}
</style>