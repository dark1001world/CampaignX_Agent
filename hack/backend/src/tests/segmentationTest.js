import { segmentUsers } from "../agents/segmentationAgent.js"

const runTest = async () => {

  const parsedBrief = {
    target_segment: "all"
  }

  const result = await segmentUsers(parsedBrief)

  console.log("Segmented Users:")
  console.log(result.slice(0,5))
}

runTest()