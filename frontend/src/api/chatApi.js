import axios from "axios"

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api"
})

API.interceptors.response.use(
  res => res,
  err => {
    const message = err?.response?.data?.message || err.message
    return Promise.reject(new Error(message))
  }
)


API.interceptors.request.use(config => {
  const token = localStorage.getItem("token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export const saveChat = async (message, chat_id = null) => {
  const res = await API.post("/chat/save", { message, chat_id })
  return res.data
}


export const getChatHistory = async () => {
  const res = await API.get("/chat/history")
  return res.data
}

export const getChatById = async (chatId) => {
  const res = await API.get(`/chat/${chatId}`)
  return res.data
}


export const archiveChat = async (chatId) => {
  const res = await API.patch(`/chat/${chatId}/archive`)
  return res.data
}


export const deleteChat = async (chatId) => {
  const res = await API.delete(`/chat/${chatId}`)
  return res.data
}