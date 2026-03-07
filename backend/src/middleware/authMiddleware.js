import jwt from "jsonwebtoken"
import { User } from "../models/User.model.js"

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized — no token" })
    }

    const token = authHeader.split(" ")[1]

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    const user = await User.findById(decoded.id).select("-password")

    if (!user) {
      return res.status(401).json({ message: "Not authorized — user not found" })
    }

    req.user = user
    next()

  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Not authorized — token expired" })
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Not authorized — invalid token" })
    }
    return res.status(500).json({ message: "Server error in auth middleware" })
  }
}

