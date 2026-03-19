import axios from "axios"

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api"
})

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token")
  if (token) {
    config.headers = config.headers || {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

API.interceptors.response.use(
  res => res,
  err => {
    const message = err?.response?.data?.message || err.message
    return Promise.reject(new Error(message))
  }
)

export const approveOptimized = async (campaign_id) => {
  const res = await API.post("/campaign/approve-optimized", { campaign_id })
  return res.data
}

export const createCampaign = async (data) => {
  const res = await API.post("/campaign/create", data)
  return res.data
}

export const approveCampaign = async (campaign_id, accepted_variant_ids = ["A", "B", "C"]) => {
  const res = await API.post("/campaign/approve", {
    campaign_id,
    accepted_variant_ids,
  })
  return res.data
}

export const collectAbTestMetrics = async (campaign_id) => {
  const res = await API.post("/campaign/collect-metrics", { campaign_id })
  return res.data
}

export const confirmWinner = async (campaign_id) => {
  const res = await API.post("/campaign/confirm-winner", { campaign_id })
  return res.data
}

export const analyzeCampaign = async (campaign_id) => {
  const res = await API.post("/campaign/analyze", { campaign_id })
  return res.data
}

export const relaunchCampaign = async (campaign_id) => {
  const res = await API.post("/campaign/relaunch", { campaign_id })
  return res.data
}


export const rejectCampaign = async (campaign_id, reason = "Rejected by user") => {
  const res = await API.post("/campaign/reject", { campaign_id, reason })
  return res.data
}

export const getCampaignStatus = async (campaign_id) => {
  const res = await API.get(`/campaign/status/${campaign_id}`)
  return res.data
}

export const optimizeAndRetestWinner = async (campaign_id) => {
  const res = await API.post("/campaign/optimize-retest", { campaign_id })
  return res.data
}