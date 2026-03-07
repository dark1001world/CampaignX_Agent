import 'dotenv/config'
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { ChatMistralAI } from "@langchain/mistralai"

const model = new ChatMistralAI({
  apiKey: process.env.MISTRAL_API_KEY,
  model: "mistral-small-latest",
  temperature: 0.7
})

export const generateCampaign = async ({ segment, strategy, recipient_count }) => {

  const strategyText = Object.entries(strategy)
    .map(([seg, hints]) =>
      `${seg}: tone="${hints.subject_tone}", focus="${hints.content_focus}", best_time="${hints.best_send_time}"`
    )
    .join("\n")

  const prompt = ChatPromptTemplate.fromTemplate(`
You are an email marketing copywriter for a financial services brand.

Target Segment: {segment}
Total Recipients: {recipient_count}

Segment Strategy:
{strategy}

Instructions:
- Match the tone and content focus defined in the strategy above
- Keep subject line under 60 characters
- Keep body between 100-200 words
- Make the CTA action-oriented and specific

Return ONLY a valid JSON object with no markdown, no backticks, no explanation:
{{
  "subject": "...",
  "body": "...",
  "cta": "..."
}}
`)

  const chain = prompt.pipe(model)

  let parsed
  try {
    const response = await chain.invoke({
      segment: JSON.stringify(segment),
      strategy: strategyText,
      recipient_count
    })

    const cleaned = response.content.replace(/```json|```/g, "").trim()
    parsed = JSON.parse(cleaned)
  } catch (e) {
    throw new Error(`[campaignAgent] Failed to parse LLM response: ${e.message}`)
  }

  const required = ["subject", "body", "cta"]
  for (const key of required) {
    if (!parsed[key]) throw new Error(`[campaignAgent] Missing field: ${key}`)
  }

  return parsed
}