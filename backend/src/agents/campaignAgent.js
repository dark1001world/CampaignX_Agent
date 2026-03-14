import 'dotenv/config'
import { ChatPromptTemplate } from "@langchain/core/prompts"
import { ChatMistralAI } from "@langchain/mistralai"

const randomSeed = Math.random()

const model = new ChatMistralAI({
  apiKey: process.env.MISTRAL_API_KEY,
  model: "mistral-small-latest",
  temperature: 0.5, 
})


const FALLBACK_EMAILS = {
  vip_loyalist: {
    subject:     "Your exclusive Term Deposit rate is waiting",
    subject_alt: "We reserved something special for you",
    preheader:   "Up to 9.2% p.a. — only for valued members",
    body:        `You've been with SuperBFSI for a while — and we don't take that lightly.\n\nMost savings accounts give you 3–4%. Your loyalty unlocks up to 9.2% p.a. on a SuperBFSI Term Deposit — guaranteed, no market risk, no surprises.\n\nFlexible tenures from 6 to 36 months. 100% capital protected. DICGC insured up to ₹5 lakh.\n\nThis exclusive rate is reserved for members like you. It won't last long.`,
    cta:         "Claim My Loyalty Rate Now",
  },
  mature_segment: {
    subject:     "Senior citizens earn 0.5% extra — limited period",
    subject_alt: "Safe, steady growth. No jargon, no risk.",
    preheader:   "100% capital safe. DICGC insured. Easy to start.",
    body:        `You've worked hard for your savings. They deserve to work hard for you.\n\nSuperBFSI Term Deposit gives you guaranteed returns — up to 9% p.a. for senior citizens. No market ups and downs. No complicated steps. Just set it and watch it grow.\n\nYour principal is 100% safe and insured up to ₹5 lakh by DICGC.\n\nOpen in minutes online. No branch visit needed. No hidden charges.`,
    cta:         "Start My Safe Term Deposit",
  },
  general: {
    subject:     "Your savings deserve better than 3%",
    subject_alt: "Guaranteed returns up to 9% p.a. — SuperBFSI TD",
    preheader:   "Safe, simple, and far better than your bank FD",
    body:        `Most savings accounts quietly pay you 3% while inflation runs at 6%.\n\nSuperBFSI Term Deposit changes that — with guaranteed returns up to 9% p.a., 100% capital protection, and flexible tenures from 6 to 36 months.\n\nTrusted by thousands of customers. DICGC insured. Open fully online in minutes.\n\nNo hidden fees. No market risk. Just guaranteed growth.`,
    cta:         "See How Much I Can Earn",
  },
}

const getFallback = (segment) =>
  FALLBACK_EMAILS[segment] ?? FALLBACK_EMAILS.general

// ── Validation helpers ────────────────────────────────────────────────────────
const SPAM_WORDS = ["free", "guaranteed", "act now", "click here", "winner", "congratulations", "no cost", "risk free"]

const hasSpamWords = (text = "") =>
  SPAM_WORDS.some(w => text.toLowerCase().includes(w))

const isValidEmail = (parsed) => {
  const required = ["subject", "subject_alt", "preheader", "body", "cta"]
  for (const key of required) {
    if (!parsed[key] || typeof parsed[key] !== "string" || parsed[key].trim().length < 5) {
      throw new Error(`[campaignAgent] Missing or empty required field: "${key}"`)
    }
  }
  if (parsed.subject.length > 60) {
    console.warn(`[campaignAgent] Subject line too long (${parsed.subject.length} chars) — may be truncated in inbox`)
  }
  if (hasSpamWords(parsed.subject) || hasSpamWords(parsed.subject_alt)) {
    console.warn(`[campaignAgent] Warning: subject line may contain spam-trigger words`)
  }
  if (parsed.preheader.length < 40 || parsed.preheader.length > 70) {
    console.warn(`[campaignAgent] Preheader length ${parsed.preheader.length} is outside optimal 40–70 char range`)
  }
  const wordCount = parsed.body.trim().split(/\s+/).length
  if (wordCount < 80 || wordCount > 220) {
    console.warn(`[campaignAgent] Body word count (${wordCount}) is outside optimal 100–200 word range`)
  }
}

// ── Build per-segment prompt context ─────────────────────────────────────────
const buildStrategyBlock = (segment, strategyHints) => {
  const hint = strategyHints[segment] ?? strategyHints.general ?? {}
  return [
    `Segment:       ${segment}`,
    `Tone:          ${hint.subject_tone      ?? "professional"}`,
    `Content Focus: ${hint.content_focus     ?? "SuperBFSI Term Deposit benefits"}`,
    `Urgency Hook:  ${hint.urgency_hook      ?? "Limited-time offer"}`,
    `Proof Point:   ${hint.proof_point       ?? "Up to 9% p.a. | 100% capital safe | DICGC insured"}`,
    `Best Send Time:${hint.best_send_time    ?? "weekday mornings"}`,
  ].join("\n")
}

// ── Main agent ────────────────────────────────────────────────────────────────
export const generateCampaign = async ({ segment, strategyHints, recipient_count }) => {

  const strategyBlock = buildStrategyBlock(segment, strategyHints)

  const prompt = ChatPromptTemplate.fromTemplate( `Random creative seed: ${randomSeed}
You are an award-winning email marketing copywriter for SuperBFSI, a trusted Indian financial services brand.
You are writing ONE targeted campaign email for the Term Deposit product launch.

## AUDIENCE
- Segment: {segment}
- Recipients: {recipient_count}
- Strategy:
{strategy}

## PRODUCT FACTS (use these, do not invent numbers)
- Product: SuperBFSI Term Deposit
- Returns: Up to 9% p.a. (9.2% for VIP/senior citizens)
- Capital: 100% protected, no market risk
- Insurance: DICGC insured up to ₹5 lakh
- Tenures: 6, 12, 24, or 36 months
- Minimum deposit: ₹1,000
- Opening: 100% digital, no branch visit, no hidden charges
- Senior citizen benefit: +0.5% extra rate

## SUBJECT LINE RULES
- Under 60 characters — hard limit
- Use the urgency hook or proof point from the strategy above
- Tactics (pick ONE): curiosity gap | personalization | urgency/scarcity | specific number
- NO spam words: free, guaranteed, act now, click here, winner, risk-free
- Provide a second A/B variant subject line with a different tactic than the first

## PREHEADER RULES
- 40–70 characters
- Must complement — not repeat — the subject line
- Tease the single most compelling benefit for this segment

## BODY RULES
- 100–200 words total
- Line 1: a hook that speaks directly to this segment's pain point or desire
- Paragraph 1: why they need this NOW (agitate the problem or opportunity)
After paragraph 1, insert a ONE-LINE value hook in bold or caps:
  e.g. "That's ₹X extra per year — guaranteed."
- Paragraph 2: SuperBFSI Term Deposit as the answer — use 1–2 proof points from the product facts above
- Paragraph 3: remove friction — easy, safe, trusted, fast to open
Paragraph 3 must end with a friction-remover:
  "No paperwork. No branch visit. Done in 2 minutes."
- Short sentences. Blank lines between paragraphs. Scannable.
- Tone must match the strategy: {strategy}
- Write like a trusted friend who knows finance — NOT a bank brochure
Final line before CTA must create urgency:
  "This rate is available for a limited period only."

### CTA (70% of your score depends on this)
- Never ask for commitment: NO "Apply", "Open Account", "Start", "Register"
- Use curiosity or calculator CTAs: 
  "See How Much ₹10,000 Earns" / "Calculate My Returns" / "Check My Rate"
- The CTA must answer: "what do I get by clicking RIGHT NOW?"
- Add one micro-commitment line before the CTA in the body:
  e.g. "Takes 30 seconds. No forms. Just your number."

## OUTPUT FORMAT
Return ONLY a valid JSON object. No markdown. No backticks. No text before or after.

{{
  "subject":     "...",
  "subject_alt": "...",
  "preheader":   "...",
  "body":        "...",
  "cta":         "..."
}}
`)

  const chain = prompt.pipe(model)

  let parsed
  let usedFallback = false

  try {
    const response = await chain.invoke({
      segment,
      strategy:        strategyBlock,
      recipient_count: recipient_count.toLocaleString("en-IN"),
    })

    const cleaned = response.content
      .replace(/```json|```/gi, "")
      .replace(/^[^{]*/, "")
      .replace(/[^}]*$/, "")
      .trim()

    parsed = JSON.parse(cleaned)

  } catch (e) {
    console.error(`[campaignAgent] LLM failed for segment "${segment}": ${e.message}`)
    console.warn(`[campaignAgent] Using fallback email for segment: ${segment}`)
    parsed = getFallback(segment)
    usedFallback = true
  }

  // Validate all fields — warns on quality issues, throws on missing fields
  isValidEmail(parsed)

  console.log(`[campaignAgent] ✓ Email generated for segment "${segment}" | subject: "${parsed.subject}" | fallback: ${usedFallback}`)

  return {
    ...parsed,
    meta: {
      segment,
      recipient_count,
      usedFallback,
      generatedAt: new Date().toISOString(),
    }
  }
}