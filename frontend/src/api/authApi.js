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

export const register = async (name, email, password) => {
  const res = await API.post("/auth/register", { name, email, password })
  return res.data
}

export const login = async (email, password) => {
  const res = await API.post("/auth/login", { email, password })
  return res.data
}

export const getMe = async () => {
  const res = await API.get("/auth/me")
  return res.data
}