import 'dotenv/config'
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { ChatMistralAI } from "@langchain/mistralai"

const model = new ChatMistralAI({
  apiKey: process.env.MISTRAL_API_KEY,
  model: "mistral-small-latest",
  temperature: 0.7
})

export const generateCampaign = async (segment) => {

  const prompt = ChatPromptTemplate.fromTemplate(`
  Generate an email marketing campaign.

  Segment:
  {segment}

  Return ONLY a valid JSON object with no markdown, no backticks, no explanation:
  {{
    "subject": "...",
    "body": "...",
    "cta": "..."
  }}
  `)

  const chain = prompt.pipe(model)

  const response = await chain.invoke({
    segment: JSON.stringify(segment)
  })

  // Strip markdown code fences if model wraps in ```json ... ```
  const cleaned = response.content.replace(/```json|```/g, "").trim()

  return JSON.parse(cleaned)
}