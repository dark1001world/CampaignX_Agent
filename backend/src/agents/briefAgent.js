import { ChatPromptTemplate } from "@langchain/core/prompts"
import { ChatMistralAI } from "@langchain/mistralai"
import 'dotenv/config'

const model = new ChatMistralAI({
  apiKey: process.env.MISTRAL_API_KEY,
  model: "mistral-small-latest",
  temperature: 0.3,
})

const VALID_SEGMENTS = [
  "all",
  "vip_loyalist",
  "at_risk_customer",
  "high_potential_prospect",
  "digital_native",
  "entrepreneur_segment",
  "family_segment",
  "mature_segment",
  "credit_rebuilder",
  "salaried_mid_market",
  "general",
]

const defaults = {
  goal: "general campaign",
  target_segment: "all",
  tone: "professional",
  product: "our latest offer",
  max_recipients: null
}

export const interpretBrief = async (brief) => {

  const prompt = ChatPromptTemplate.fromTemplate(`
You are a campaign planning assistant. Extract structured campaign details from the brief below.

Brief:
{brief}

Rules for target_segment — you MUST use one of these exact values (or an array of them):
${VALID_SEGMENTS.map(s => `  - "${s}"`).join("\n")}

Use "all" when the brief targets everyone or does not specify a segment.
Use an array like ["digital_native","entrepreneur_segment"] when multiple segments are mentioned.

Return ONLY a valid JSON object — no markdown, no backticks, no explanation:
{{
  "goal": "...",
  "target_segment": "all",
  "tone": "professional",
  "product": "...",
  "max_recipients": null
}}
`)

  const chain = prompt.pipe(model)
  const response = await chain.invoke({ brief })
  const cleaned = response.content.replace(/```json|```/g, "").trim()

  let parsed
  try {
    parsed = JSON.parse(cleaned)
  } catch (e) {
    throw new Error(`[briefAgent] Failed to parse LLM response: ${cleaned}`)
  }

  for (const key of Object.keys(defaults)) {
    if (parsed[key] == null || parsed[key] === "") {
      
      parsed[key] = defaults[key]
    }
  }

  const isValid = (val) => VALID_SEGMENTS.includes(val)
  const segmentOk = Array.isArray(parsed.target_segment)
    ? parsed.target_segment.every(isValid)
    : isValid(parsed.target_segment)

  if (!segmentOk) {
    
    parsed.target_segment = "all"
  }

  return parsed
}