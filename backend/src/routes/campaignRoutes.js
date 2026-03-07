import express from "express"

import {
  createCampaign,
  approveCampaignController,
  analyzeCampaignController,
  relaunchCampaignController,
  collectAbTestMetricsController,
  confirmAndSendWinnerController

} from "../controllers/campaignController.js"

const router = express.Router()


router.post("/create", createCampaign)

router.post("/approve", approveCampaignController)


router.post("/analyze", analyzeCampaignController)


router.post("/relaunch", relaunchCampaignController)
router.post("/collect-metrics", collectAbTestMetricsController)
router.post("/confirm-winner",  confirmAndSendWinnerController)

export default router