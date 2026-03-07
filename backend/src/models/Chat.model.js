import mongoose from "mongoose"

const messageSchema = new mongoose.Schema(
  {
    role:        { type: String, enum: ["user", "agent"], required: true },
    text:        { type: String, default: null },
    type:        { type: String, default: "text" },
    campaign_id: { type: String, default: null },
    data:        { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
)

const chatSchema = new mongoose.Schema(
  {
    user_id:  { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title:    { type: String, default: "New Campaign" },
    messages: [messageSchema],
    status:   { type: String, enum: ["active", "archived"], default: "active" },
  },
  { timestamps: true }
)

export const Chat = mongoose.models.Chat
  ?? mongoose.model("Chat", chatSchema)