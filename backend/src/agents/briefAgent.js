import { ChatPromptTemplate } from "@langchain/core/prompts"
import { ChatMistralAI } from "@langchain/mistralai"
import 'dotenv/config'

const model = new ChatMistralAI({
  apiKey: process.env.MISTRAL_API_KEY,
  model: "mistral-small-latest",
  temperature: 0.7
})

export const interpretBrief = async (brief) => {

  const prompt = ChatPromptTemplate.fromTemplate(`
Extract campaign details from this brief:

{brief}

Return ONLY a valid JSON object with no markdown, no backticks, no explanation:
{{
  "goal": "...",
  "target_segment": "...",
  "tone": "...",
  "product": "..."
}}
`)

  const chain = prompt.pipe(model)

  const response = await chain.invoke({
    brief: brief
  })

  const cleaned = response.content.replace(/```json|```/g, "").trim()
  return JSON.parse(cleaned)
}