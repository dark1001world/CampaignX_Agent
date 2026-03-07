import jwt from "jsonwebtoken"
import { User } from "../models/User.model.js"

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "7d"
  })
}

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required" })
    }

    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(409).json({ message: "User already exists with this email" })
    }

    const user = await User.create({ name, email, password })

    return res.status(201).json({
      message: "Registration successful",
      token: generateToken(user._id),
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email
      }
    })

  } catch (error) {
    console.error("[register]", error.message)
    return res.status(500).json({ message: error.message })
  }
}

export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" })
    }

    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    const isMatch = await user.matchPassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    return res.json({
      message: "Login successful",
      token: generateToken(user._id),
      user: {
        id:    user._id,
        name:  user.name,
        email: user.email
      }
    })

  } catch (error) {
    console.error("[login]", error.message)
    return res.status(500).json({ message: error.message })
  }
}

export const getMe = async (req, res) => {
  try {
    return res.json({
      id:    req.user._id,
      name:  req.user.name,
      email: req.user.email
    })
  } catch (error) {
    console.error("[getMe]", error.message)
    return res.status(500).json({ message: error.message })
  }
}