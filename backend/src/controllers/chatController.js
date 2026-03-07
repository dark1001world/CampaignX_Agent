import { Chat } from "../models/Chat.model.js"

const generateTitle = (text = "") => {
  return text.length > 50 ? text.slice(0, 50) + "..." : text || "New Campaign"
}


export const saveChat = async (req, res) => {
  try {
    const { chat_id, message } = req.body

    if (!message || !message.role || (!message.text && !message.data)) {
      return res.status(400).json({ message: "Invalid message format" })
    }

    if (chat_id) {
      const chat = await Chat.findOne({ _id: chat_id, user_id: req.user._id })

      if (!chat) {
        return res.status(404).json({ message: "Chat not found" })
      }

      chat.messages.push(message)
      await chat.save()

      return res.json({
        message: "Message saved",
        chat_id: chat._id,
        chat
      })
    }

    
    const newChat = await Chat.create({
      user_id:  req.user._id,
      title:    generateTitle(message.text),
      messages: [message]
    })

    return res.status(201).json({
      message: "Chat created",
      chat_id: newChat._id,
      chat:    newChat
    })

  } catch (error) {
    console.error("[saveChat]", error.message)
    return res.status(500).json({ message: error.message })
  }
}

export const getChatHistory = async (req, res) => {
  try {
    const chats = await Chat.find({ user_id: req.user._id, status: "active" })
      .select("_id title createdAt updatedAt messages")
      .sort({ updatedAt: -1 })

    return res.json({ chats })

  } catch (error) {
    console.error("[getChatHistory]", error.message)
    return res.status(500).json({ message: error.message })
  }
}

export const getChatById = async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id:     req.params.chatId,
      user_id: req.user._id
    })

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" })
    }

    return res.json({ chat })

  } catch (error) {
    console.error("[getChatById]", error.message)
    return res.status(500).json({ message: error.message })
  }
}


export const archiveChat = async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id:     req.params.chatId,
      user_id: req.user._id
    })

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" })
    }

    chat.status = "archived"
    await chat.save()

    return res.json({ message: "Chat archived", chat_id: chat._id })

  } catch (error) {
    console.error("[archiveChat]", error.message)
    return res.status(500).json({ message: error.message })
  }
}


export const deleteChat = async (req, res) => {
  try {
    const chat = await Chat.findOneAndDelete({
      _id:     req.params.chatId,
      user_id: req.user._id
    })

    if (!chat) {
      return res.status(404).json({ message: "Chat not found" })
    }

    return res.json({ message: "Chat deleted" })

  } catch (error) {
    console.error("[deleteChat]", error.message)
    return res.status(500).json({ message: error.message })
  }
}