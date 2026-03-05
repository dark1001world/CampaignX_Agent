import express from "express"
import { createCampaign } from "../controllers/campaignController.js"

const router = express.Router()

router.post("/create", createCampaign)

export default router