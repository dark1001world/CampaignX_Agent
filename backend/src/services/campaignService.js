import axios from "axios"
import "dotenv/config"


const buildEmailBody = (campaign) => {
  const { body, cta, preheader } = campaign

  const ctaUrl = process.env.CAMPAIGN_CTA_URL || "https://superbfsi.com/xdeposit/explore/"


  const parts = [
    body.trim(),
    "",
    `${cta}: ${ctaUrl}`,
    "",
    `To unsubscribe: ${process.env.CAMPAIGN_UNSUBSCRIBE_URL || "https://superbfsi.com/unsubscribe"}`,
  ]

  const fullBody = parts.join("\n")

 
  if (fullBody.length > 5000) {
    console.warn(`[sendCampaign] Body length ${fullBody.length} exceeds 5000 chars — truncating body text`)
    const overhead  = fullBody.length - body.trim().length
    const maxBody   = 5000 - overhead - 10
    return parts
      .map((p, i) => i === 0 ? p.slice(0, maxBody) : p)
      .join("\n")
  }

  return fullBody
}


export const sendCampaign = async (campaign, customerIds) => {

  const validIds = customerIds.filter(Boolean)
  if (validIds.length === 0)
    throw new Error("[sendCampaign] No valid customer IDs to send to")
  if (!campaign.subject)
    throw new Error("[sendCampaign] subject is required")
  if (campaign.subject.length > 200)
    throw new Error(`[sendCampaign] subject exceeds 200 characters (${campaign.subject.length})`)
  if (!campaign.body)
    throw new Error("[sendCampaign] body is required")
  if (!campaign.cta)
    throw new Error("[sendCampaign] cta is required")
  if (!process.env.CAMPAIGN_CTA_URL)
    console.warn("[sendCampaign] CAMPAIGN_CTA_URL not set in .env — using fallback URL")

  const body = buildEmailBody(campaign)

  console.log(`[sendCampaign] Body preview:\n${body.slice(0, 300)}...`)
  console.log(`[sendCampaign] Body length: ${body.length} chars`)

  let response
  try {
    response = await axios.post(
      `${process.env.CAMPAIGNX_BASE_URL}/api/v1/send_campaign`,
      {
        subject:           campaign.subject,
        body,
        list_customer_ids: validIds,
        send_time:         campaign.send_time,
      },
      {
        headers: {
          "X-API-Key":    process.env.CAMPAIGNX_API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 15_000,
      }
    )
  } catch (e) {
    const status    = e?.response?.status
    const detail    = e?.response?.data?.message || e.message
    const fullError = JSON.stringify(e?.response?.data, null, 2)
    console.error("[sendCampaign] Full error response:", fullError)
    throw new Error(`[sendCampaign] API call failed (${status}): ${detail}`)
  }

  const data        = response.data
  const campaign_id = Array.isArray(data) ? data[0]?.campaign_id : data?.campaign_id

  if (!campaign_id) {
    console.error("[sendCampaign] No campaign_id in response:", data)
    throw new Error("[sendCampaign] campaign_id missing from response")
  }

  console.log(`[sendCampaign] ✓ Sent to ${validIds.length} recipients — campaign_id: ${campaign_id}`)
  return { campaign_id, raw: data }
}