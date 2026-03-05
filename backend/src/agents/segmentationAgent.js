import axios from "axios"
import "dotenv/config"

export const segmentUsers = async (parsedBrief) => {

  const response = await axios.get(
    `${process.env.CAMPAIGNX_BASE_URL}/api/v1/get_customer_cohort`,
    {
      headers: {
        "X-API-Key": process.env.CAMPAIGNX_API_KEY
      }
    }
  )

  const customers = response.data.data

  // simple segmentation logic
  let selectedCustomers

  if (parsedBrief.target_segment === "all") {
    selectedCustomers = customers
  } else {
    // fallback segmentation example
    selectedCustomers = customers.slice(0, 50)
  }

  // return only customer IDs
  const customerIds = selectedCustomers.map(
    user => user.customer_id
  )

  return customerIds
}