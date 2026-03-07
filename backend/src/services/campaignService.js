import axios from "axios"
import "dotenv/config"

export const sendCampaign = async (campaign, customerIds) => {

  
  const validIds = customerIds.filter(Boolean)
  if (validIds.length === 0) {
    throw new Error("[sendCampaign] No valid customer IDs to send to")
  }

  if (!campaign.subject) {
    throw new Error("[sendCampaign] subject is required")
  }
  if (campaign.subject.length > 200) {
    throw new Error(`[sendCampaign] subject exceeds 200 characters (${campaign.subject.length})`)
  }

  
  const fullBody = campaign.cta
    ? `${campaign.body}\n\n${campaign.cta}`
    : campaign.body

  let response
  try {
    response = await axios.post(
      `${process.env.CAMPAIGNX_BASE_URL}/api/v1/send_campaign`,
      {
        subject:           campaign.subject,
        body:              fullBody,
        list_customer_ids: validIds,
        send_time:         campaign.send_time
      },
      {
        headers: {
          "X-API-Key":    process.env.CAMPAIGNX_API_KEY,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    )
  } catch (e) {
    const status = e?.response?.status
    const detail = e?.response?.data?.message || e.message
     const fullError = JSON.stringify(e?.response?.data, null, 2)  
  console.error(`[sendCampaign] Full error response:`, fullError)  
    throw new Error(`[sendCampaign] API call failed (${status}): ${detail}`)
  }

  const data = response.data

 

  const campaign_id = Array.isArray(data)
    ? data[0]?.campaign_id
    : data?.campaign_id

  if (!campaign_id) {
    console.error("[sendCampaign] No campaign_id found in response:", data)
    throw new Error("campaign_id missing from sendCampaign response")
  }
  

  console.log("[sendCampaign] campaign_id:", campaign_id)

  return { campaign_id, raw: data }
}