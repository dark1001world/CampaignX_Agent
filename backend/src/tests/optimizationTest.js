import { optimizeCampaign } from "../agents/optimizationAgent.js"

const runTest = async () => {

  const campaign = {
    subject: "Special Offer",
    body: "Check out our premium plan",
    cta: "Try Now"
  }

  const metrics = {
    open_rate: 8,
    click_rate: 1
  }

  const result = await optimizeCampaign(campaign, metrics)

  console.log("Optimized Campaign:")
  console.log(result)
}

runTest()