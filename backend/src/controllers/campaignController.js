import {
  runCampaignPipeline,
  approveCampaign,
  collectAbTestMetrics,
  confirmAndSendWinner,
  approveOptimizedCampaign,
  approveAndRelaunchOptimized,
  analyzeCampaign,
  relaunchOptimizedCampaign,
  MAX_OPTIMIZATION_ATTEMPTS,
  optimizeAndRetestWinner,
} from "../orchestrator/campaignOrchestrator.js"

import { Campaign } from "../models/Campaign.model.js"

const getStatus = (message = "") => {
  if (message.includes("not found")) return 404
  if (message.includes("already")) return 409
  if (message.includes("required") || message.includes("missing")) return 400
  return 500
}

export const createCampaign = async (req, res) => {
  try {
    const { brief } = req.body
    if (!brief) return res.status(400).json({ message: "brief is required" })
    const result = await runCampaignPipeline(brief)
    res.json(result)
  } catch (error) {
    console.error("[createCampaign]", error.message)
    res.status(getStatus(error.message)).json({ message: error.message })
  }
}

export const approveCampaignController = async (req, res) => {
  try {
    const { campaign_id, accepted_variant_ids, acceptedVariantIds } = req.body
    if (!campaign_id) return res.status(400).json({ message: "campaign_id is required" })

    const variantIds = accepted_variant_ids ?? acceptedVariantIds ?? ["A", "B", "C"]
    const result = await approveCampaign(campaign_id, variantIds)
    res.json(result)
  } catch (error) {
    console.error("[approveCampaign]", error.message)
    res.status(getStatus(error.message)).json({ message: error.message })
  }
}

export const rejectCampaignController = async (req, res) => {
  try {
    const { campaign_id, reason } = req.body
    if (!campaign_id) return res.status(400).json({ message: "campaign_id is required" })
    const doc = await Campaign.findOne({ temp_id: campaign_id })
    if (!doc) return res.status(404).json({ message: "Campaign not found" })
    if (doc.status !== "PENDING_APPROVAL")
      return res.status(409).json({ message: `Campaign already ${doc.status}` })
    await Campaign.updateOne(
      { temp_id: campaign_id },
      { status: "REJECTED", reject_reason: reason ?? "Rejected by user" }
    )
    res.json({
      message: "Campaign rejected",
      campaign_id,
      status: "REJECTED",
      reason: reason ?? "Rejected by user",
    })
  } catch (error) {
    console.error("[rejectCampaign]", error.message)
    res.status(getStatus(error.message)).json({ message: error.message })
  }
}

export const collectAbTestMetricsController = async (req, res) => {
  try {
    const { campaign_id } = req.body
    if (!campaign_id) return res.status(400).json({ message: "campaign_id is required" })
    const result = await collectAbTestMetrics(campaign_id)
    res.json(result)
  } catch (error) {
    console.error("[collectAbTestMetrics]", error.message)
    res.status(getStatus(error.message)).json({ message: error.message })
  }
}

export const confirmAndSendWinnerController = async (req, res) => {
  try {
    const { campaign_id } = req.body
    if (!campaign_id) return res.status(400).json({ message: "campaign_id is required" })
    const result = await confirmAndSendWinner(campaign_id)
    res.json(result)
  } catch (error) {
    console.error("[confirmAndSendWinner]", error.message)
    res.status(getStatus(error.message)).json({ message: error.message })
  }
}


export const approveOptimizedController = async (req, res) => {
  try {
    const { campaign_id, approved_micro_segments } = req.body
    if (!campaign_id) return res.status(400).json({ message: "campaign_id is required" })
    const result = await approveOptimizedCampaign(campaign_id, approved_micro_segments ?? "all")
    res.json(result)
  } catch (error) {
    console.error("[approveOptimized]", error.message)
    res.status(getStatus(error.message)).json({ message: error.message })
  }
}


export const approveRelaunchOptimizedController = async (req, res) => {
  try {
    const { campaign_id, approved_micro_segments } = req.body
    if (!campaign_id) return res.status(400).json({ message: "campaign_id is required" })
    let doc = await Campaign.findOne({ temp_id: campaign_id })
    if (!doc) doc = await Campaign.findOne({ real_campaign_id: campaign_id })
    if (!doc) return res.status(404).json({ message: "Campaign not found" })
    const result = await approveAndRelaunchOptimized(doc.temp_id, approved_micro_segments ?? "all")
    res.json(result)
  } catch (error) {
    console.error("[approveRelaunchOptimized]", error.message)
    res.status(getStatus(error.message)).json({ message: error.message })
  }
}

export const analyzeCampaignController = async (req, res) => {
  try {
    const { campaign_id } = req.body
    if (!campaign_id) return res.status(400).json({ message: "campaign_id is required" })

    await new Promise(r => setTimeout(r, 500))
    const result = await analyzeCampaign(campaign_id)
    res.json(result)
  } catch (error) {
    console.error("[analyzeCampaign]", error.message)
    res.status(getStatus(error.message)).json({ message: error.message })
  }
}

export const relaunchCampaignController = async (req, res) => {
  try {
    const { campaign_id } = req.body
    if (!campaign_id) return res.status(400).json({ message: "campaign_id is required" })

    const doc = await Campaign.findOne({ real_campaign_id: campaign_id })
    if (doc?.status === "RELAUNCHED")
      return res.status(409).json({ message: "Campaign already relaunched" })
    const result = await relaunchOptimizedCampaign(campaign_id)
    res.json(result)
  } catch (error) {
    console.error("[relaunchCampaign]", error.message)
    res.status(getStatus(error.message)).json({ message: error.message })
  }
}

export const getCampaignStatusHandler = async (req, res) => {
  try {
    const doc = await Campaign.findOne({ temp_id: req.params.campaign_id })
    if (!doc) return res.status(404).json({ message: "Not found" })

    const attemptsSoFar = doc.optimizationHistory?.length ?? 0
    const optResult = doc.optimizationResult ?? null


    const attempts_remaining = Math.max(0, MAX_OPTIMIZATION_ATTEMPTS - attemptsSoFar)

    const needsOptApproval = doc.status === "OPTIMIZATION_PENDING_APPROVAL"
    const needsWinnerConfirm = doc.status === "WINNER_PENDING_CONFIRMATION"


    const optimization_preview = (needsOptApproval && optResult?.variants?.length)
      ? optResult.variants.map(v => ({
        micro_segment: v.micro_segment,
        base_segment: v.base_segment,
        diagnosis: v.diagnosis ?? null,
        subject: v.campaign?.subject,
        body: v.campaign?.body,
        cta: v.campaign?.cta,
        send_time: v.send_time,
        style: v.campaign?.style_applied,
        tone: v.campaign?.tone_applied,
      }))
      : null


    const winner = doc.winner
      ? {
        id: doc.winner.id,
        score: doc.winner.score ?? null,
        metrics: doc.winner.metrics ?? null,
        campaign: doc.winner.campaign ?? null,
      }
      : null

    res.json({
      status: doc.status,
      real_campaign_id: doc.real_campaign_id ?? null,
      relaunch_results: doc.relaunchResults ?? null,

      ab_metrics: doc.abMetrics ?? null,
      ab_test_results: doc.abTestResults ?? null,
      metrics: doc.metrics ?? null,
      score: doc.finalScore ?? null,
      max_reached: doc.status === "COMPLETED" && (doc.optimizationHistory?.length ?? 0) >= MAX_OPTIMIZATION_ATTEMPTS,

      winner,
      attempts_remaining,


      approval_required: needsOptApproval || needsWinnerConfirm,

      overall_diagnosis: needsOptApproval ? (optResult?.overall_diagnosis ?? null) : null,
      micro_segments_found: needsOptApproval ? (optResult?.micro_segments?.length ?? 0) : 0,
      variants_generated: needsOptApproval ? (optResult?.variants?.length ?? 0) : 0,
      optimization_mode: needsOptApproval ? (optResult?.mode ?? null) : null,
      optimization_preview,
    })
  } catch (error) {
    console.error("[getCampaignStatus]", error.message)
    res.status(500).json({ message: error.message })
  }
}

export const optimizeAndRetestWinnerController = async (req, res) => {
  try {
    const { campaign_id } = req.body
    if (!campaign_id) return res.status(400).json({ message: "campaign_id is required" })
    // Guard against double-submit
    const doc = await Campaign.findOne({ temp_id: campaign_id })
    if (doc?.status === "AB_TEST_SENT")
      return res.status(409).json({ message: "Retest already in progress" })
    const result = await optimizeAndRetestWinner(campaign_id)
    res.json(result)
  } catch (error) {
    console.error("[optimizeAndRetestWinner]", error.message)
    res.status(getStatus(error.message)).json({ message: error.message })
  }
}