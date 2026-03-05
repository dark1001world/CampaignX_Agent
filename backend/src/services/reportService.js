import axios from "axios"
import "dotenv/config"
export const getCampaignReport = async (campaignId) => {

  const response = await axios.get(
    `https://campaignx.inxiteout.ai/api/v1/get_report?campaign_id=${campaignId}`,
    {
      headers: {
        "X-API-Key": process.env.CAMPAIGNX_API_KEY,
      }
    }
  )

  return response.data.data
}