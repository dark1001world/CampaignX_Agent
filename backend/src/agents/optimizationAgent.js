import { ChatPromptTemplate } from "@langchain/core/prompts"
import { ChatMistralAI } from "@langchain/mistralai"
import 'dotenv/config'

const model = new ChatMistralAI({
  apiKey: process.env.MISTRAL_API_KEY,
  model: "mistral-small-latest",
  temperature: 0.7
})

const invokeWithRetry = async (chain, input, retries = 3, delayMs = 5000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await chain.invoke(input)
    } catch (err) {
      const is429 = err?.status === 429
        || err?.message?.includes("429")
        || err?.message?.includes("Rate limit")
      if (is429 && attempt < retries) {
        const wait = delayMs * attempt
        console.warn(`[optimizeCampaign] Rate limited — retrying in ${wait}ms (attempt ${attempt}/${retries})`)
        await new Promise(r => setTimeout(r, wait))
      } else {
        throw err
      }
    }
  }
}

export const optimizeCampaign = async (campaign, metrics) => {

  const trimmedCampaign = {
    subject: campaign.subject,
    cta:     campaign.cta,
    body:    campaign.body,  
  }

  const openRate  = metrics?.open_rate  ?? 0
  const clickRate = metrics?.click_rate ?? 0

  const optimizationFocus = []
  if (openRate < 0.20)  optimizationFocus.push("- open_rate is low: rewrite the subject line to be more compelling, curiosity-driven, or personalized")
  if (clickRate < 0.05) optimizationFocus.push("- click_rate is low: strengthen the CTA with urgency, clarity, or a stronger value proposition")
  if (openRate >= 0.20 && clickRate >= 0.05) optimizationFocus.push("- metrics are acceptable: make minor improvements to tone and clarity")

  const prompt = ChatPromptTemplate.fromTemplate(`
You are an email marketing optimizer for a financial services brand.

Original Campaign:
{campaign}

Performance Metrics:
{metrics}

Optimization Instructions:
{optimizationFocus}

- Keep subject line under 60 characters
- Keep body between 100-200 words
- Make the CTA action-oriented and specific
- Do not change the core product or offer

Return ONLY a valid JSON object with no markdown, no backticks, no explanation:
{{
  "subject": "...",
  "body": "...",
  "cta": "..."
}}
  `)

  const chain = prompt.pipe(model)

  const response = await invokeWithRetry(chain, {
    campaign:          JSON.stringify(trimmedCampaign),
    metrics:           JSON.stringify(metrics),
    optimizationFocus: optimizationFocus.join("\n")
  })

  const cleaned = response.content.replace(/```json|```/g, "").trim()

  try {
    return JSON.parse(cleaned)
  } catch (e) {
    console.error("[optimizeCampaign] Failed to parse JSON — returning original campaign")
    
    return campaign
  }
}