import express from "express"
import {
  saveChat,
  getChatHistory,
  getChatById,
  archiveChat,
  deleteChat
} from "../controllers/chatController.js"
import { protect } from "../middleware/authMiddleware.js"

const router = express.Router()


router.use(protect)

router.post("/save",                saveChat)
router.get("/history",              getChatHistory)
router.get("/:chatId",              getChatById)
router.patch("/:chatId/archive",    archiveChat)
router.delete("/:chatId",           deleteChat)

export default router