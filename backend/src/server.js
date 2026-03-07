import 'dotenv/config'
import express from "express"
import cors from "cors"
import authRoutes from "./routes/authRoutes.js"
import chatRoutes from "./routes/chatRoutes.js"
import campaignRoutes from "./routes/campaignRoutes.js"
import { connectDB } from "./config/db.js"

const app = express()

app.use(cors())
app.use(express.json())

connectDB()

app.get("/", (req, res) => {
  res.send("AI Campaign Backend Running 🚀")
})
app.use("/api/auth", authRoutes)
app.use("/api/chat", chatRoutes)
app.use("/api/campaign", campaignRoutes)


const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})