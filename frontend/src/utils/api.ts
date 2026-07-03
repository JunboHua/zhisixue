import { useUserStore } from '@/stores/user'

// 自动检测运行环境，选择对应后端地址
function getBaseUrl(): string {
  // 开发模式：uni-app dev server
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000/api'
  }
  // Capacitor Android App：通过 192.168.18.2 访问宿主机 localhost（模拟器）
  // 真机请改为电脑的局域网 IP，如 http://192.168.1.100:3000/api
  if (typeof window !== 'undefined' && (window as any).Capacitor?.getPlatform() === 'android') {
    return 'https://pelvis-playmate-outsource.ngrok-free.dev/api'
  }
  // H5 生产模式：同域代理或相对路径
  return '/api'
}

const BASE_URL = getBaseUrl()

interface ResponseData<T = any> {
  message: string
  data?: T
  token?: string
  user?: any
  analysis?: any
  question?: string
  nextQuestion?: string
  isCompleted?: boolean
  sessions?: any[]
  session?: any
  resources?: any[]
  resource?: any
  report?: string
}

export async function request<T = any>(
  url: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  data?: Record<string, any>,
  headers: Record<string, string> = {}
): Promise<ResponseData<T>> {
  const userStore = useUserStore()

  if (userStore.token) {
    headers['Authorization'] = `Bearer ${userStore.token}`
  }

  // ngrok 免费版会弹警告页，加此头跳过
  headers['ngrok-skip-browser-warning'] = 'true'

  return new Promise((resolve, reject) => {
    uni.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        ...headers
      },
      success: (res) => {
        const result = res.data as ResponseData<T>
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(result)
        } else {
          reject(new Error(result.message || '请求失败'))
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络请求失败'))
      }
    })
  })
}

export async function uploadFile(
  url: string,
  filePath: string,
  name?: string,
  formData?: Record<string, any>
): Promise<ResponseData> {
  const userStore = useUserStore()
  const uploadUrl = `${BASE_URL}${url}`

  console.log('上传地址:', uploadUrl)
  console.log('用户Token:', userStore.token ? '已设置' : '未设置')

  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url: uploadUrl,
      filePath: filePath,
      name: name || 'file',
      formData: formData || {},
      header: {
        'Authorization': `Bearer ${userStore.token}`,
        'ngrok-skip-browser-warning': 'true'
      },
      success: (res: any) => {
        console.log('上传响应状态:', res.statusCode)
        console.log('上传响应数据:', res.data)

        try {
          const result = JSON.parse(res.data) as ResponseData
          if (res.statusCode === 200 || res.statusCode === 201) {
            resolve(result)
          } else {
            reject(new Error(result.message || '上传失败'))
          }
        } catch (e) {
          console.error('JSON解析失败:', e)
          console.error('原始响应数据:', res.data)
          reject(new Error(`响应解析失败: ${typeof res.data === 'string' ? res.data.substring(0, 200) : '非字符串响应'}`))
        }
      },
      fail: (err: any) => {
        console.error('上传失败:', err)
        reject(new Error(err.errMsg || '上传失败'))
      }
    } as any)
  })
}

export const authApi = {
  register: (data: { username: string; email: string; password: string }) =>
    request('/auth/register', 'POST', data),
  
  login: (data: { username: string; password: string }) =>
    request('/auth/login', 'POST', data),
  
  profile: () => request('/auth/profile', 'GET')
}

export const resourceApi = {
  upload: (filePath: string) => uploadFile('/resources/upload', filePath),
  
  list: () => request('/resources/list', 'GET'),
  
  get: (id: string) => request(`/resources/${id}`, 'GET'),
  
  delete: (id: string) => request(`/resources/${id}`, 'DELETE')
}

export const aiApi = {
  parse: (data: { content: string }) => request('/ai/parse', 'POST', data),
  
  question: (data: { knowledgePoint: string; description?: string; userLevel?: string }) =>
    request('/ai/question', 'POST', data),
  
  analyze: (data: { knowledgePoint: string; description?: string; userAnswer: string }) =>
    request('/ai/analyze', 'POST', data),
  
  followUp: (data: { knowledgePoint: string; userAnswer: string; analysis: any }) =>
    request('/ai/followup', 'POST', data),
  
  report: (data: { 
    knowledgePoints: string[]; 
    duration: number; 
    interactions: number; 
    correctCount: number; 
    errorDistribution: Record<string, number>; 
    masteryChange: number 
  }) => request('/ai/report', 'POST', data)
}

export const learningApi = {
  start: (data: { resourceId: string; knowledgePointId: string; knowledgePointTitle: string }) =>
    request('/learning/start', 'POST', data),
  
  answer: (data: { sessionId: string; userAnswer: string }) =>
    request('/learning/answer', 'POST', data),
  
  sessions: () => request('/learning/sessions', 'GET'),
  
  session: (id: string) => request(`/learning/session/${id}`, 'GET')
}