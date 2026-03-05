import mongoose from "mongoose"

const campaignSchema = new mongoose.Schema({
  segment: String,
  subject: String,
  body: String,
  cta: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
})

export default mongoose.model("Campaign", campaignSchema)