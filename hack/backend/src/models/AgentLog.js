import mongoose from "mongoose"

const agentLogSchema = new mongoose.Schema({
  agent: String,
  action: String,
  result: Object,
  createdAt: { type: Date, default: Date.now }
})

export default mongoose.model("AgentLog", agentLogSchema)