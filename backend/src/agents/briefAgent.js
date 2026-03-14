import { ChatPromptTemplate } from "@langchain/core/prompts"
import { ChatMistralAI }      from "@langchain/mistralai"
import 'dotenv/config'

const model = new ChatMistralAI({
  apiKey:      process.env.MISTRAL_API_KEY,
  model:       "mistral-small-latest",
  temperature: 0.5,
})

const VALID_SEGMENTS = [
  "all", "vip_loyalist", "at_risk_customer", "high_potential_prospect",
  "digital_native", "entrepreneur_segment", "family_segment", "mature_segment",
  "credit_rebuilder", "salaried_mid_market", "general",
  "yield_chaser", "eco_conscious", "custom",
]

const VALID_TONES = [
  "professional", "casual", "urgent", "empathetic", "exclusive", "educational", "transparent",
]

const VALID_CAMPAIGN_TYPES = [
  "product_launch",   
  "re_engagement",    
  "retention",       
  "awareness",        
  "seasonal",         
  "drip_sequence",    
  "compliance_heavy", 
  "multi_segment",    
]

const defaults = {
  goal:              "Launch product and drive customer sign-ups",
  target_segment:    "all",
  tone:              "professional",
  product:           "SuperBFSI financial product",
  max_recipients:    null,
  campaign_type:     "product_launch",
  priority:          "normal",
}

export const interpretBrief = async (brief) => {

  const prompt = ChatPromptTemplate.fromTemplate(`
You are a senior campaign strategist and AI pipeline router at SuperBFSI.
Your job is to extract a precise, structured campaign plan AND detect how complex the campaign is.

## BRIEF
{brief}

## YOUR TASK
Extract all fields below. Think carefully about complexity detection 

---

### STANDARD FIELDS

**goal**: One sentence — product name + desired customer action.

**target_segment**: One of the exact values below, or an array:
${VALID_SEGMENTS.map(s => `  - "${s}"`).join("\n")}
Use "custom" if the brief defines segments not in this list (e.g. "yield chasers", "eco-conscious savers").

**tone**: One of: ${VALID_TONES.join(", ")}

**product**: Exact product name from the brief.

**max_recipients**: Integer if specified, null if not.

**campaign_type**: One of: ${VALID_CAMPAIGN_TYPES.join(", ")}
- Use "drip_sequence" if the brief mentions multiple emails, steps, or a sequence
- Use "compliance_heavy" if there are legal/regulatory constraints on claims
- Use "multi_segment" if the brief targets 2+ very different audiences
- Use "product_launch" for simple single-email product campaigns

**priority**: "high" if brief mentions urgency/deadlines, else "normal"

---

### COMPLEXITY DETECTION FIELDS (critical — read brief carefully)

**is_complex**: true if ANY of these are present:
- Multiple email steps / drip sequence
- Legal compliance rules on what can/cannot be claimed
- Variable or rate-constrained financial products
- 2+ diametrically opposed target segments
- Conditional optimization triggers (e.g. "if metric drops, switch X")
- Blackout or exclusion rules for specific customers
Otherwise false.

**drip_steps**: Number of emails in the sequence. 1 if single email. Max 10.

**has_rate**: true if the product has an interest rate, APY, APR, or return rate.

**rate_is_variable**: true if the rate is described as variable, linked to a benchmark, or legally constrained.

**rate_value**: The numeric rate value (e.g. 5.5 for "5.5% APY"). null if not mentioned.

**rate_unit**: "p.a.", "APY", "APR", or whatever unit the brief uses. null if no rate.

**needs_blackout**: true if the brief mentions excluding customers with complaints, tickets, or service issues.

**compliance_rules**: Array of strings — each a specific legal constraint from the brief.
Examples:
  - "Rate must always be described as variable"
  - "Cannot claim guaranteed returns"
  - "Must include greenwashing disclaimer"
  - "Must cite certifying body for green claims"
Empty array if no compliance rules.

**optimization_triggers**: Array of strings — each a conditional optimization rule from the brief.
Examples:
  - "If eco segment CTOR < 12%, switch hero from wind_turbines to financial_growth and rewrite subject to be transparent"
  - "If open_rate < 20%, rewrite subject line"
  - "If rate changes, update all live campaign copy within 60 minutes"
Empty array if no conditional triggers.

**custom_segments**: Array of segment definitions inferred from the brief.
Each entry: {{"name": "...", "description": "...", "tone": "...", "hero_angle": "...", "primary_hook": "..."}}
Empty array if all segments are standard.

**pipeline**: 
- "complex" if is_complex is true
- "standard" if is_complex is false

---

## OUTPUT FORMAT
Return ONLY a valid JSON object. No markdown. No backticks. No text before or after.

{{
  "goal":                  "...",
  "target_segment":        "all",
  "tone":                  "professional",
  "product":               "...",
  "max_recipients":        null,
  "campaign_type":         "product_launch",
  "priority":              "normal",
  "is_complex":            false,
  "drip_steps":            1,
  "has_rate":              false,
  "rate_is_variable":      false,
  "rate_value":            null,
  "rate_unit":             null,
  "needs_blackout":        false,
  "compliance_rules":      [],
  "optimization_triggers": [],
  "custom_segments":       [],
  "pipeline":              "standard"
}}
`)

  const chain = prompt.pipe(model)

  let raw
  try {
    const response = await chain.invoke({ brief })
    raw = response.content
  } catch (e) {
    throw new Error(`[briefAgent] LLM invocation failed: ${e.message}`)
  }

  const cleaned = raw
    .replace(/```json|```/gi, "")
    .replace(/^[^{]*/, "")
    .replace(/[^}]*$/, "")
    .trim()

  let parsed
  try {
    parsed = JSON.parse(cleaned)
  } catch (e) {
    throw new Error(`[briefAgent] Failed to parse LLM response: ${cleaned}`)
  }


  for (const [key, defaultValue] of Object.entries(defaults)) {
    if (parsed[key] == null || parsed[key] === "") {
      console.warn(`[briefAgent] Missing "${key}" — applying default: ${JSON.stringify(defaultValue)}`)
      parsed[key] = defaultValue
    }
  }

  
  const isValidSegment = (val) => VALID_SEGMENTS.includes(val)
  if (Array.isArray(parsed.target_segment)) {
    const valid   = parsed.target_segment.filter(isValidSegment)
    const invalid = parsed.target_segment.filter(s => !isValidSegment(s))
    if (invalid.length > 0) console.warn(`[briefAgent] Dropping invalid segments: ${invalid.join(", ")}`)
    parsed.target_segment = valid.length > 0 ? valid : "all"
  } else if (!isValidSegment(parsed.target_segment)) {
    console.warn(`[briefAgent] Invalid segment "${parsed.target_segment}" — falling back to "all"`)
    parsed.target_segment = "all"
  }

  
  if (!VALID_TONES.includes(parsed.tone)) parsed.tone = "professional"


  if (!VALID_CAMPAIGN_TYPES.includes(parsed.campaign_type)) parsed.campaign_type = "product_launch"


  if (!["high", "normal", "low"].includes(parsed.priority)) parsed.priority = "normal"

  
  if (parsed.max_recipients !== null) {
    const coerced = parseInt(parsed.max_recipients, 10)
    parsed.max_recipients = isNaN(coerced) ? null : coerced
  }
  if (parsed.rate_value !== null) {
    const coerced = parseFloat(parsed.rate_value)
    parsed.rate_value = isNaN(coerced) ? null : coerced
  }
  parsed.drip_steps = Math.min(10, Math.max(1, parseInt(parsed.drip_steps, 10) || 1))

  
  const complexitySignals = [
    parsed.drip_steps > 1,
    parsed.rate_is_variable,
    parsed.needs_blackout,
    parsed.compliance_rules.length > 0,
    parsed.optimization_triggers.length > 0,
    parsed.custom_segments.length > 0,
    ["drip_sequence", "compliance_heavy", "multi_segment"].includes(parsed.campaign_type),
  ]
  if (complexitySignals.some(Boolean)) {
    parsed.is_complex = true
    parsed.pipeline   = "complex"
  }

  console.log(`[briefAgent] ✓ Parsed — pipeline: ${parsed.pipeline} | type: ${parsed.campaign_type} | steps: ${parsed.drip_steps} | complex signals: ${complexitySignals.filter(Boolean).length}`)
  console.log(`[briefAgent] Compliance rules: ${parsed.compliance_rules.length} | Optimization triggers: ${parsed.optimization_triggers.length}`)

  return parsed
}