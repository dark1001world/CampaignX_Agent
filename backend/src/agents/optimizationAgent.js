import { ChatPromptTemplate } from "@langchain/core/prompts"
import { ChatMistralAI } from "@langchain/mistralai"
import 'dotenv/config'

const model = new ChatMistralAI({
  apiKey: process.env.MISTRAL_API_KEY,
  model: "mistral-small-latest",
  temperature: 0.7
})

export const optimizeCampaign = async (campaign, metrics) => {

  const prompt = ChatPromptTemplate.fromTemplate(`
  Campaign:
  {campaign}

  Metrics:
  {metrics}

  Suggest improvements and regenerate campaign.
  `)

  const chain = prompt.pipe(model)

  const response = await chain.invoke({
    campaign: JSON.stringify(campaign),
    metrics: JSON.stringify(metrics)
  })

  return response.content
}