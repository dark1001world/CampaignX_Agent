import {
  runCampaignPipeline,
  approveCampaign,
  collectAbTestMetrics,
  confirmAndSendWinner,
  analyzeCampaign,
  relaunchOptimizedCampaign
} from "../orchestrator/campaignOrchestrator.js"


const getStatus = (message = "") => {
  if (message.includes("not found"))  return 404
  if (message.includes("already"))    return 409
  if (message.includes("required") || message.includes("missing")) return 400
  return 500
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




export const createCampaign = async (req, res) => {
  try {
    const { brief } = req.body

    if (!brief) {
      return res.status(400).json({ message: "brief is required" })
    }

    const result = await runCampaignPipeline(brief)

    
    res.json(result)

  } catch (error) {
    console.error("[createCampaign]", error.message)
    res.status(getStatus(error.message)).json({ message: error.message })
  }
}




export const approveCampaignController = async (req, res) => {
  try {
    const { campaign_id } = req.body

    if (!campaign_id) {
      return res.status(400).json({ message: "campaign_id is required" })
    }

    // Just approve and send A/B/C test — no auto analyze
    const approveResult = await approveCampaign(campaign_id)

    res.json(approveResult)

  } catch (error) {
    console.error("[approveCampaign]", error.message)
    res.status(getStatus(error.message)).json({ message: error.message })
  }
}




export const analyzeCampaignController = async (req, res) => {
  try {
    const { campaign_id } = req.body

    if (!campaign_id) {
      return res.status(400).json({ message: "campaign_id is required" })
    }

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

    if (!campaign_id) {
      return res.status(400).json({ message: "campaign_id is required" })
    }

    const result = await relaunchOptimizedCampaign(campaign_id)


    res.json(result)

  } catch (error) {
    console.error("[relaunchCampaign]", error.message)
    res.status(getStatus(error.message)).json({ message: error.message })
  }
}