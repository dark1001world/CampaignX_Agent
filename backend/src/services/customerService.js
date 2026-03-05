import axios from "axios"
import "dotenv/config"
export const getCustomerCohort = async () => {

  const response = await axios.get(
    "https://campaignx.inxiteout.ai/api/v1/get_customer_cohort",
    {
      headers: {
        "X-API-Key": process.env.CAMPAIGNX_API_KEY,
        "Content-Type": "application/json"

      }
    }
  )

  return response.data.data
}