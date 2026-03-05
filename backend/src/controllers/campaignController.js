import { runCampaignPipeline } from "../orchestrator/campaignOrchestrator.js";

export const createCampaign = async (req, res) => {
  try {

    const { brief } = req.body;

    const result = await runCampaignPipeline(brief);

    res.json({
      success: true,
      result
    });

  } catch (error) {

    res.status(500).json({
      error: error.message
    });

  }
};