import { interpretBrief } from "../agents/briefAgent.js"

const runTest = async () => {
  const brief = "Create a campaign to re-engage inactive users for premium plan"

  const result = await interpretBrief(brief)

  console.log("Brief Interpretation Result:")
  console.log(result)
}

runTest()