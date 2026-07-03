<template>
  <view class="container">
    <view class="upload-area" @click="chooseFile">
      <view class="upload-icon">📤</view>
      <text class="upload-title">点击上传学习资料</text>
      <text class="upload-desc">支持 PDF、Word、图片、文本等格式</text>
      <text class="upload-size">单个文件不超过 50MB</text>
    </view>

    <view class="file-info" v-if="selectedFile">
      <view class="file-details">
        <text class="file-name">{{ selectedFile.name }}</text>
        <text class="file-size">{{ formatSize(selectedFile.size) }}</text>
      </view>
      <view class="btn btn-secondary" @click="selectedFile = null">重新选择</view>
    </view>

    <view class="btn btn-primary btn-block mt-lg" :class="{ loading: isUploading }" @click="handleUpload">
      <text v-if="isUploading">上传中...</text>
      <text v-else>开始上传</text>
    </view>

    <view class="tip-section">
      <text class="tip-title">💡 上传提示</text>
      <view class="tip-list">
        <text class="tip-item">• 建议上传清晰的学习资料，便于AI解析</text>
        <text class="tip-item">• 支持上传课本扫描件、课堂笔记、错题本等</text>
        <text class="tip-item">• AI会自动提取知识点并构建知识框架</text>
      </view>
    </view>

    <view class="manual-input" v-if="showManualInput">
      <text class="section-title">或者手动输入知识点</text>
      <textarea 
        class="textarea" 
        v-model="manualContent" 
        placeholder="请输入学习内容或知识点..."
        :maxlength="5000"
      ></textarea>
      <view class="btn btn-outline btn-block mt-md" @click="parseManualContent">
        <text>解析知识点</text>
      </view>
    </view>

    <view class="btn btn-secondary btn-block mt-md" @click="showManualInput = !showManualInput">
      <text>{{ showManualInput ? '隐藏手动输入' : '手动输入知识点' }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { resourceApi, aiApi } from '@/utils/api'

const selectedFile = ref<any>(null)
const isUploading = ref(false)
const showManualInput = ref(false)
const manualContent = ref('')

function chooseFile() {
  uni.chooseFile({
    count: 1,
    type: 'file',
    success: (res) => {
      const file = res.tempFiles[0]
      if (file.size > 50 * 1024 * 1024) {
        uni.showToast({ title: '文件大小不能超过50MB', icon: 'none' })
        return
      }
      selectedFile.value = file
    },
    fail: () => {
      uni.showToast({ title: '选择文件失败', icon: 'none' })
    }
  })
}

function formatSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

async function handleUpload() {
  if (!selectedFile.value) {
    uni.showToast({ title: '请先选择文件', icon: 'none' })
    return
  }

  isUploading.value = true

  try {
    console.log('开始上传文件:', selectedFile.value.path)
    const res = await resourceApi.upload(selectedFile.value.path)
    console.log('上传成功:', res)
    uni.showToast({ title: res.message || '上传成功', icon: 'success' })

    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (error: any) {
    console.error('上传失败:', error)
    const errorMsg = error?.message || error?.errMsg || JSON.stringify(error) || '上传失败'
    uni.showToast({ title: errorMsg, icon: 'none', duration: 3000 })
  } finally {
    isUploading.value = false
  }
}

async function parseManualContent() {
  if (!manualContent.value.trim()) {
    uni.showToast({ title: '请输入内容', icon: 'none' })
    return
  }

  isUploading.value = true
  
  try {
    const res = await aiApi.parse({ content: manualContent.value.trim() })
    uni.showToast({ title: '解析成功', icon: 'success' })
    
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  } catch (error: any) {
    uni.showToast({ title: error.message || '解析失败', icon: 'none' })
  } finally {
    isUploading.value = false
  }
}
</script>

<style lang="scss">
.container {
  padding-bottom: 48rpx;
}

.upload-area {
  background: $bg-primary;
  border: 2rpx dashed $border-color;
  border-radius: $radius-lg;
  padding: 60rpx 32rpx;
  text-align: center;
  margin-bottom: 24rpx;
  
  &:active {
    border-color: $primary-color;
    background: $primary-light;
  }
}

.upload-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.upload-title {
  font-size: 32rpx;
  font-weight: 500;
  color: $text-primary;
  display: block;
  margin-bottom: 8rpx;
}

.upload-desc {
  font-size: 26rpx;
  color: $text-secondary;
  display: block;
  margin-bottom: 8rpx;
}

.upload-size {
  font-size: 24rpx;
  color: $text-muted;
}

.file-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: $bg-primary;
  padding: 20rpx 24rpx;
  border-radius: $radius-md;
  margin-bottom: 24rpx;
}

.file-details {
  flex: 1;
}

.file-name {
  font-size: 28rpx;
  color: $text-primary;
  display: block;
  margin-bottom: 4rpx;
}

.file-size {
  font-size: 24rpx;
  color: $text-muted;
}

.tip-section {
  background: $bg-primary;
  padding: 24rpx;
  border-radius: $radius-lg;
  margin-bottom: 24rpx;
}

.tip-title {
  font-size: 28rpx;
  font-weight: 500;
  color: $text-primary;
  display: block;
  margin-bottom: 16rpx;
}

.tip-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.tip-item {
  font-size: 26rpx;
  color: $text-secondary;
  line-height: 1.5;
}

.manual-input {
  background: $bg-primary;
  padding: 24rpx;
  border-radius: $radius-lg;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 500;
  color: $text-primary;
  display: block;
  margin-bottom: 16rpx;
}

.textarea {
  width: 100%;
  height: 200rpx;
  padding: 20rpx;
  border: 2rpx solid $border-color;
  border-radius: $radius-md;
  font-size: 28rpx;
  box-sizing: border-box;
}

.btn.loading {
  opacity: 0.7;
}
</style>