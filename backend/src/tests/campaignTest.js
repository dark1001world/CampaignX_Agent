import { generateCampaign } from "../agents/campaignAgent.js"

const runTest = async () => {

  const segment = [
    { customer_id: "CUST001" },
    { customer_id: "CUST002" }
  ]

  const result = await generateCampaign(segment)

  console.log("Generated Campaign:")
  console.log(result)
}

runTest()