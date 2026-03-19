import axios from "axios"
import "dotenv/config"

export const getCampaignReport = async (campaignId) => {

  let response
  try {
    response = await axios.get(
      `${process.env.CAMPAIGNX_BASE_URL}/api/v1/get_report`,
      {
        params:  { campaign_id: campaignId },
        headers: { "X-API-Key": process.env.CAMPAIGNX_API_KEY },
        timeout: 15_000,
      }
    )
  } catch (e) {
    const status = e?.response?.status
    const detail = e?.response?.data?.message || e.message
    throw new Error(`[getCampaignReport] API call failed (${status}): ${detail}`)
  }

  const { data, total_rows } = response.data

  if (!Array.isArray(data)) {
    throw new Error("[getCampaignReport] Unexpected response — data field is not an array")
  }

  const total     = total_rows ?? data.length
  const opened    = data.filter(r => r.EO === "Y").length
  const clicked   = data.filter(r => r.EC === "Y").length
  const delivered = data.filter(r => r.ED === "Y").length

  // ⚠ Critical: click_rate must be calculated against DELIVERED not total sent
  // Undelivered emails physically cannot be clicked — dividing by total
  // artificially deflates click_rate and can mask a healthy campaign
  const deliveredCount = delivered > 0 ? delivered : total
  const clickRate      = deliveredCount > 0 ? clicked / deliveredCount : 0
  const openRate       = deliveredCount > 0 ? opened  / deliveredCount : 0

  const metrics = {
    sent:          total,
    delivered:     deliveredCount,
    opened,
    clicked,
    open_rate:     openRate,
    click_rate:    clickRate,
    // Derived insight flags — used by optimizationAgent
    high_open_zero_click: openRate >= 0.20 && clickRate === 0,
    below_threshold:      openRate < 0.20  || clickRate < 0.05,
  }

  console.log("[getCampaignReport] metrics:", metrics)
  return metrics
}