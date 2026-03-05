import axios from "axios"
import "dotenv/config"
export const sendCampaign = async (campaign, customerIds) => {

  const response = await axios.post(
    "https://campaignx.inxiteout.ai/api/v1/send_campaign",
    {
      subject: campaign.subject,
      body: campaign.body,
      list_customer_ids: customerIds,
      send_time: campaign.send_time
    },
    {
      headers: {
        "X-API-Key": process.env.CAMPAIGNX_API_KEY,
        "Content-Type": "application/json"
      }
    }
  )

  return response.data
}