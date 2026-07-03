import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const token = ref('')
  const userInfo = ref<{
    id: string
    username: string
    email: string
    learningProfile?: {
      knowledgePoints?: Record<string, {
        mastery: number
        wrongTypes: string[]
        lastPractice?: string
      }>
      weakAreas?: string[]
      totalLearningTime?: number
      completedPoints?: number
    }
  } | null>(null)

  const isLoggedIn = () => {
    return !!token.value && !!userInfo.value
  }

  const login = (newToken: string, user: typeof userInfo.value) => {
    token.value = newToken
    userInfo.value = user
    uni.setStorageSync('token', newToken)
    uni.setStorageSync('userInfo', JSON.stringify(user))
  }

  const logout = () => {
    token.value = ''
    userInfo.value = null
    uni.removeStorageSync('token')
    uni.removeStorageSync('userInfo')
  }

  const initFromStorage = () => {
    const savedToken = uni.getStorageSync('token')
    const savedUserInfo = uni.getStorageSync('userInfo')
    if (savedToken && savedUserInfo) {
      token.value = savedToken
      try {
        userInfo.value = JSON.parse(savedUserInfo)
      } catch {
        userInfo.value = null
      }
    }
  }

  const updateLearningProfile = (profile: {
    knowledgePoints?: Record<string, {
      mastery: number
      wrongTypes: string[]
      lastPractice?: string
    }>
    weakAreas?: string[]
    totalLearningTime?: number
    completedPoints?: number
  }) => {
    if (userInfo.value) {
      userInfo.value.learningProfile = profile
      uni.setStorageSync('userInfo', JSON.stringify(userInfo.value))
    }
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    login,
    logout,
    initFromStorage,
    updateLearningProfile
  }
})