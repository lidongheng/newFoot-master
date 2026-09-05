/**
 * Axios 封装
 * 统一请求配置、拦截器、错误处理
 */
import axios from 'axios'

// 创建 axios 实例
const service = axios.create({
  baseURL: '/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 可以在这里添加token等认证信息
    // const token = localStorage.getItem('token')
    // if (token) {
    //   config.headers['Authorization'] = `Bearer ${token}`
    // }
    return config
  },
  (error) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    const res = response.data
    
    // 根据后端约定的code判断请求是否成功
    if (res.code === 200) {
      return res.data
    } else {
      // 业务错误
      console.error('业务错误:', res.message)
      const businessError = new Error(res.message || '请求失败')
      businessError.code = res.code
      businessError.data = res.data
      return Promise.reject(businessError)
    }
  },
  (error) => {
    // 网络错误或服务器错误
    console.error('响应错误:', error)
    
    let message = '网络错误，请稍后重试'
    if (error.response) {
      switch (error.response.status) {
        case 400:
          message = '请求参数错误'
          break
        case 401:
          message = '未授权，请登录'
          break
        case 403:
          message = '拒绝访问'
          break
        case 404:
          message = '请求地址不存在'
          break
        case 500:
          message = '服务器内部错误'
          break
        default:
          message = error.response.data?.message || '请求失败'
      }
    } else if (error.code === 'ECONNABORTED') {
      message = '请求超时'
    }
    
    return Promise.reject(new Error(message))
  }
)

export default service
