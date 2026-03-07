import axios from "axios"
import "dotenv/config"

export const getCampaignReport = async (campaignId) => {

  

  let response
  try {
    response = await axios.get(
      `${process.env.CAMPAIGNX_BASE_URL}/api/v1/get_report`,
      {
        params: { campaign_id: campaignId },  
        headers: {
          "X-API-Key": process.env.CAMPAIGNX_API_KEY,
        },
        timeout: 15000
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

  
  const total   = total_rows ?? data.length
  const opened  = data.filter(r => r.EO === "Y").length
  const clicked = data.filter(r => r.EC === "Y").length
  const delivered = data.filter(r => r.ED === "Y").length

  const metrics = {
    sent:       total,
    delivered:  delivered > 0 ? delivered : total,
    open_rate:  total > 0 ? opened  / total : 0,
    click_rate: total > 0 ? clicked / total : 0,
    opened,
    clicked,
  }

  console.log("[getCampaignReport] aggregated metrics:", metrics)
  return metrics
}