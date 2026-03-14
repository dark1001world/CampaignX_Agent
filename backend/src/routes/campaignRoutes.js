import express from "express"
import {
  createCampaign,
  approveCampaignController,
  rejectCampaignController,
  collectAbTestMetricsController,
  confirmAndSendWinnerController,
  approveOptimizedController,
  approveRelaunchOptimizedController,  
  analyzeCampaignController,
  relaunchCampaignController,
  getCampaignStatusHandler,
  optimizeAndRetestWinnerController,
} from "../controllers/campaignController.js"

const router = express.Router()

// ── Step 1–4: Create campaign (Brief → Segment → Generate × 3 → Save) ────────
router.post("/create",           createCampaign)


router.post("/approve",          approveCampaignController)
router.post("/reject",           rejectCampaignController)

router.post("/collect-metrics",  collectAbTestMetricsController)

router.post("/confirm-winner",   confirmAndSendWinnerController)

router.post("/approve-optimized", approveOptimizedController)


router.post("/approve-relaunch", approveRelaunchOptimizedController)


router.post("/analyze",          analyzeCampaignController)


router.post("/relaunch",         relaunchCampaignController)

router.get("/status/:campaign_id", getCampaignStatusHandler)
router.post("/optimize-retest", optimizeAndRetestWinnerController)

export default router