import axios from "axios"
import "dotenv/config"

const SEGMENT_STRATEGY = {
  vip_loyalist: {
    subject_tone:    "exclusive, VIP-first",
    content_focus:   "Early access to SuperBFSI Term Deposit with preferential rates. Reward their loyalty — offer a rate bump (+0.25% extra p.a.) as an exclusive perk. Emphasize capital safety and guaranteed returns befitting their premium status.",
    send_frequency:  "bi-weekly",
    best_send_time:  "weekday mornings",
    urgency_hook:    "Exclusive rate locked for valued members — expires in 7 days",
    proof_point:     "Up to 9.2% p.a. — your exclusive loyalty rate",
    min_score:       75,
  },
  at_risk_customer: {
    subject_tone:    "helpful, re-engagement, low-pressure",
    content_focus:   "Soft win-back via Term Deposit as a 'safe restart' product. Acknowledge inactivity without blame. Frame TD as zero-risk, no-monitoring-needed. Nudge KYC completion as the first step to unlock the offer.",
    send_frequency:  "weekly",
    best_send_time:  "weekday evenings",
    urgency_hook:    "Your money could be working harder — takes 2 mins to start",
    proof_point:     "100% capital protected. No market risk. Just steady growth.",
    min_score:       20,
  },
  high_potential_prospect: {
    subject_tone:    "value-driven, aspirational, credibility-led",
    content_focus:   "First-time pitch of SuperBFSI Term Deposit. Lead with superior rate vs savings account. Build trust fast with brand credibility signals. Make sign-up feel effortless — digital onboarding, no branch visit needed.",
    send_frequency:  "weekly",
    best_send_time:  "weekday mornings",
    urgency_hook:    "Limited introductory rate for new customers — opens this month only",
    proof_point:     "Earn 3x more than a regular savings account. DICGC insured.",
    min_score:       40,
  },
  digital_native: {
    subject_tone:    "casual, punchy, FOMO-driven",
    content_focus:   "Short, scroll-stopping copy. Lead with the rate number boldly. Emphasize 100% app-based TD opening — no paperwork, no branch. Tie into hustle mindset: park side-income safely while it grows.",
    send_frequency:  "2x weekly",
    best_send_time:  "evenings & weekends",
    urgency_hook:    "Your savings are losing to inflation. Fix it in 60 seconds.",
    proof_point:     "Open your Term Deposit in the app. Done in 60 seconds.",
    min_score:       35,
  },
  entrepreneur_segment: {
    subject_tone:    "business-forward, ROI-focused, peer-level",
    content_focus:   "Position TD as smart idle-cash management for business surplus. Emphasize flexible tenures to match business cash-flow cycles (6, 12, 24 months). Stress liquidity options (premature withdrawal) and business-grade trust.",
    send_frequency:  "weekly",
    best_send_time:  "weekday mornings",
    urgency_hook:    "Your idle business funds are losing value every day",
    proof_point:     "Flexible 6–36 month tenures. Premature withdrawal available.",
    min_score:       30,
  },
  family_segment: {
    subject_tone:    "warm, protective, future-focused",
    content_focus:   "Frame Term Deposit as a family safety net — a guaranteed fund for school fees, emergencies, or a family goal. Speak to the emotional need to protect loved ones. Highlight nominee facility and joint account option.",
    send_frequency:  "bi-weekly",
    best_send_time:  "weekend mornings",
    urgency_hook:    "Build a guaranteed safety net for your family — starting today",
    proof_point:     "Guaranteed returns. Nominate a family member. Fully insured.",
    min_score:       25,
  },
  mature_segment: {
    subject_tone:    "trustworthy, jargon-free, reassuring",
    content_focus:   "Speak plainly — no financial jargon. Emphasize guaranteed returns, capital protection, and DICGC insurance. Senior citizen rate benefit (+0.5% extra) is the headline hook. Stress simplicity: set it, forget it, collect at maturity.",
    send_frequency:  "monthly",
    best_send_time:  "weekday mid-morning",
    urgency_hook:    "Senior citizens earn 0.5% extra — limited period offer",
    proof_point:     "Your principal is 100% safe. Insured up to ₹5 lakh by DICGC.",
    min_score:       20,
  },
  credit_rebuilder: {
    subject_tone:    "empathetic, constructive, non-judgmental",
    content_focus:   "Position TD as a no-credit-check, zero-risk product anyone can open regardless of credit history. Emphasize it as a positive financial habit and stepping stone. Keep tone hopeful, never condescending.",
    send_frequency:  "bi-weekly",
    best_send_time:  "weekday evenings",
    urgency_hook:    "Start fresh — guaranteed growth, no credit score required",
    proof_point:     "No credit check needed. Open with as little as ₹1,000.",
    min_score:       15,
  },
  salaried_mid_market: {
    subject_tone:    "practical, benefit-led, relatable",
    content_focus:   "Speak to the monthly salary cycle — suggest parking a portion of salary into TD each month. Compare TD returns vs savings account clearly. Position as smarter than a bank FD with better rates and easier digital access.",
    send_frequency:  "weekly",
    best_send_time:  "weekday mornings",
    urgency_hook:    "Salary credited? Put ₹5,000 to work before you spend it.",
    proof_point:     "Better rate than your bank FD. Open online in minutes.",
    min_score:       30,
  },
  general: {
    subject_tone:    "neutral, informative, curiosity-driven",
    content_focus:   "Broad awareness of SuperBFSI Term Deposit. Lead with the rate and safety angle. Keep copy accessible and universal. Use a soft CTA to explore the product rather than hard-sell.",
    send_frequency:  "bi-weekly",
    best_send_time:  "weekday mornings",
    urgency_hook:    "A smarter place for your savings — guaranteed returns await",
    proof_point:     "Trusted by thousands. Rates up to 9% p.a. DICGC insured.",
    min_score:       0,
  },
}


const RELATED_SEGMENTS = {
  vip_loyalist:           ["salaried_mid_market", "high_potential_prospect", "entrepreneur_segment"],
  at_risk_customer:       ["credit_rebuilder", "general", "salaried_mid_market"],
  high_potential_prospect:["vip_loyalist", "salaried_mid_market", "digital_native"],
  digital_native:         ["salaried_mid_market", "high_potential_prospect", "entrepreneur_segment"],
  entrepreneur_segment:   ["vip_loyalist", "salaried_mid_market", "high_potential_prospect"],
  family_segment:         ["mature_segment", "salaried_mid_market", "credit_rebuilder"],
  mature_segment:         ["family_segment", "at_risk_customer", "credit_rebuilder"],
  credit_rebuilder:       ["at_risk_customer", "general", "family_segment"],
  salaried_mid_market:    ["digital_native", "high_potential_prospect", "family_segment"],
  general:                ["salaried_mid_market", "digital_native", "at_risk_customer"],
}


const TAG_SEGMENT_AFFINITY = {
  highly_digital:     ["digital_native", "high_potential_prospect"],
  moderately_digital: ["salaried_mid_market", "digital_native"],
  high_income:        ["vip_loyalist", "entrepreneur_segment"],
  mid_income:         ["salaried_mid_market", "family_segment"],
  prime_credit:       ["vip_loyalist", "high_potential_prospect"],
  near_prime_credit:  ["salaried_mid_market", "high_potential_prospect"],
  entrepreneur:       ["entrepreneur_segment"],
  salaried:           ["salaried_mid_market"],
  senior:             ["mature_segment"],
  boomer:             ["mature_segment"],
  has_kids:           ["family_segment"],
  existing_customer:  ["vip_loyalist", "at_risk_customer"],
  prospect:           ["high_potential_prospect", "digital_native"],
  poor_credit:        ["credit_rebuilder"],
  subprime_credit:    ["credit_rebuilder"],
  kyc_incomplete:     ["at_risk_customer"],
}


const MIN_AUDIENCE_SIZE = 30

// ── Customer classifier (unchanged) ──────────────────────────────────────────
const classifyCustomer = (customer) => {
  const tags = new Set()

  const age = Number(customer.Age)
  if      (age < 25) tags.add("gen_z")
  else if (age < 35) tags.add("millennial")
  else if (age < 50) tags.add("gen_x")
  else if (age < 65) tags.add("boomer")
  else               tags.add("senior")

  const income = Number(customer.Monthly_Income)
  if      (income >= 80_000) tags.add("high_income")
  else if (income >= 40_000) tags.add("mid_income")
  else if (income >= 20_000) tags.add("low_mid_income")
  else                       tags.add("low_income")

  const credit = Number(customer["Credit score"])
  if      (credit >= 750) tags.add("prime_credit")
  else if (credit >= 650) tags.add("near_prime_credit")
  else if (credit >= 500) tags.add("subprime_credit")
  else                    tags.add("poor_credit")

  if (Number(customer.Kids_in_Household) > 0)   tags.add("has_kids")
  if (Number(customer["Dependent count"]) >= 3)  tags.add("high_dependents")
  if (Number(customer.Family_Size) === 1)         tags.add("single_household")
  if (Number(customer.Family_Size) >= 4)          tags.add("large_household")

  const occ = (customer.Occupation || "").toLowerCase()
  if      (["entrepreneur","business owner","self-employed"].some(v => occ.includes(v))) tags.add("entrepreneur")
  else if (["salaried","employee","executive"].some(v => occ.includes(v)))               tags.add("salaried")
  else if (["student"].some(v => occ.includes(v)))                                       tags.add("student")
  else if (["retired","homemaker"].some(v => occ.includes(v)))                           tags.add("retired_homemaker")

  if (customer["Occupation type"] === "Full-time")   tags.add("fulltime")
  else if (customer["Occupation type"] === "Part-time") tags.add("parttime")

  const appInstalled     = customer.App_Installed       === "Y"
  const socialActive     = customer.Social_Media_Active === "Y"
  const kycDone          = customer["KYC status"]       === "Y"
  const existingCustomer = customer["Existing Customer"] === "Y"

  if (appInstalled && socialActive)      tags.add("highly_digital")
  else if (appInstalled || socialActive) tags.add("moderately_digital")
  else                                   tags.add("low_digital")

  if (existingCustomer) tags.add("existing_customer")
  else                  tags.add("prospect")
  if (!kycDone)         tags.add("kyc_incomplete")

  if (customer.Gender === "Female")          tags.add("female")
  else if (customer.Gender === "Male")       tags.add("male")
  if (customer.Marital_Status === "Married") tags.add("married")

  let segment = "general"
  if      (tags.has("existing_customer") && tags.has("high_income")  && tags.has("prime_credit"))                            segment = "vip_loyalist"
  else if (tags.has("existing_customer") && tags.has("low_digital")  && tags.has("kyc_incomplete"))                          segment = "at_risk_customer"
  else if (tags.has("prospect")          && (tags.has("high_income") || tags.has("mid_income")) && tags.has("prime_credit")) segment = "high_potential_prospect"
  else if ((tags.has("gen_z") || tags.has("millennial")) && tags.has("highly_digital"))                                      segment = "digital_native"
  else if (tags.has("entrepreneur"))                                                                                          segment = "entrepreneur_segment"
  else if (tags.has("has_kids") && (tags.has("mid_income") || tags.has("high_income")))                                      segment = "family_segment"
  else if (tags.has("senior") || tags.has("boomer"))                                                                         segment = "mature_segment"
  else if (tags.has("poor_credit") || tags.has("subprime_credit"))                                                           segment = "credit_rebuilder"
  else if (tags.has("salaried") && tags.has("mid_income"))                                                                   segment = "salaried_mid_market"

  let score = 50
  if (appInstalled)              score += 15
  if (socialActive)              score += 10
  if (existingCustomer)          score += 10
  if (kycDone)                   score += 5
  if (tags.has("high_income"))   score += 10
  if (tags.has("prime_credit"))  score += 5
  if (tags.has("low_digital"))   score -= 15
  if (tags.has("poor_credit"))   score -= 10
  if (tags.has("high_income") || tags.has("mid_income")) score += 5
  if (tags.has("senior") || tags.has("boomer"))          score += 5
  if (tags.has("retired_homemaker"))                     score += 3

  score = Math.min(100, Math.max(0, score))

  return { segment, tags: [...tags], engagementScore: score }
}

// ── Segment-level analytics ───────────────────────────────────────────────────
const buildSegmentStats = (validSelected) => {
  const stats = {}
  for (const c of validSelected) {
    if (!stats[c.segment]) {
      stats[c.segment] = { count: 0, totalScore: 0, minScore: 100, maxScore: 0 }
    }
    const s = stats[c.segment]
    s.count++
    s.totalScore  += c.engagementScore
    s.minScore     = Math.min(s.minScore, c.engagementScore)
    s.maxScore     = Math.max(s.maxScore, c.engagementScore)
  }
  for (const seg of Object.keys(stats)) {
    stats[seg].avgScore = Math.round(stats[seg].totalScore / stats[seg].count)
    delete stats[seg].totalScore
  }
  return stats
}

const ALL_ALIASES = new Set([
  "all", "all customers", "all users", "all segments", "everyone",
  "entire base", "full list", "whole list", "no filter", "any", "*"
])

// ── Dedup helper — merge new candidates without duplicating existing IDs ──────
const mergeUnique = (existing, candidates) => {
  const existingIds = new Set(existing.map(c => c.customer_id))
  return [...existing, ...candidates.filter(c => !existingIds.has(c.customer_id))]
}


const expandAudience = (classified, parsedBrief) => {
  const rawTarget        = parsedBrief.target_segment
  const normalizedTarget = typeof rawTarget === "string" ? rawTarget.toLowerCase().trim() : rawTarget
  const isAll            = !rawTarget || ALL_ALIASES.has(normalizedTarget)
  const isArray          = Array.isArray(rawTarget)
  const cap              = parsedBrief.max_recipients > 0 ? parsedBrief.max_recipients : Infinity

  
  if (isAll) {
    console.log("[segmentUsers] target_segment=all — using full classified list")
    return { selected: classified, expansionStage: "all" }
  }

  const primarySegments = isArray
    ? rawTarget.map(t => t.toLowerCase())
    : [normalizedTarget]

 
  const applyScoreGate = (candidates, relaxFactor = 1.0) =>
    candidates.filter(c => {
      const strategy  = SEGMENT_STRATEGY[c.segment] ?? SEGMENT_STRATEGY.general
      const minScore  = (strategy.min_score ?? 0) * relaxFactor
      return c.engagementScore >= minScore
    })

  // ── STEP 1: Exact segment match + full min_score gate ────────────────────
  let selected = classified.filter(c =>
    primarySegments.includes(c.segment) || c.tags.some(t => primarySegments.includes(t))
  )
  selected = applyScoreGate(selected, 1.0)
  console.log(`[segmentUsers] Step 1 (exact match + score gate): ${selected.length}`)
  if (selected.length >= Math.min(MIN_AUDIENCE_SIZE, cap)) {
    return { selected, expansionStage: "exact_match" }
  }

  // ── STEP 2: Check minimum audience size — log the gap ────────────────────
  console.warn(
    `[segmentUsers] Step 2: Audience ${selected.length} < MIN (${MIN_AUDIENCE_SIZE}) — expanding...`
  )

  // ── STEP 3: Relax engagement score gate (50% of original min_score) ───────
  const relaxed = classified.filter(c =>
    primarySegments.includes(c.segment) || c.tags.some(t => primarySegments.includes(t))
  )
  const withRelaxedScore = applyScoreGate(relaxed, 0.5)
  selected = mergeUnique(selected, withRelaxedScore)
  console.log(`[segmentUsers] Step 3 (relaxed score gate 50%): ${selected.length}`)
  if (selected.length >= Math.min(MIN_AUDIENCE_SIZE, cap)) {
    return { selected, expansionStage: "relaxed_score" }
  }

  // ── STEP 4: Add related segments ─────────────────────────────────────────
  const relatedSegments = new Set(
    primarySegments.flatMap(seg => RELATED_SEGMENTS[seg] ?? [])
  )
  // Remove primary segments from related set to avoid double-counting
  primarySegments.forEach(s => relatedSegments.delete(s))

  const fromRelated = classified.filter(c => relatedSegments.has(c.segment))
  // Related segments use their own min_score with a 50% relaxation
  const fromRelatedGated = applyScoreGate(fromRelated, 0.5)
  selected = mergeUnique(selected, fromRelatedGated)
  console.log(`[segmentUsers] Step 4 (related segments: ${[...relatedSegments].join(", ")}): ${selected.length}`)
  if (selected.length >= Math.min(MIN_AUDIENCE_SIZE, cap)) {
    return { selected, expansionStage: "related_segments" }
  }

  // ── STEP 5: Expand by shared tags ─────────────────────────────────────────
  // Find which tags are characteristic of the primary segment(s)
  const affinitySegments = new Set()
  for (const [tag, segments] of Object.entries(TAG_SEGMENT_AFFINITY)) {
    const isRelevant = segments.some(s => primarySegments.includes(s))
    if (isRelevant) segments.forEach(s => affinitySegments.add(s))
  }
  primarySegments.forEach(s => affinitySegments.delete(s))
  ;[...relatedSegments].forEach(s => affinitySegments.delete(s)) // already added in step 4

  const fromTags = classified.filter(c => affinitySegments.has(c.segment))
  // Tag-based expansion: no score gate — we just need bodies
  selected = mergeUnique(selected, fromTags)
  console.log(`[segmentUsers] Step 5 (tag affinity segments: ${[...affinitySegments].join(", ")}): ${selected.length}`)
  if (selected.length >= Math.min(MIN_AUDIENCE_SIZE, cap)) {
    return { selected, expansionStage: "tag_affinity" }
  }

  // ── STEP 6: Final fallback — use entire classified list, sort by score ────
  console.warn(
    `[segmentUsers] Step 6: Still only ${selected.length} — falling back to full base sorted by score`
  )
  // Merge remaining classified customers (sorted by engagement score descending)
  const sortedAll = [...classified].sort((a, b) => b.engagementScore - a.engagementScore)
  selected = mergeUnique(selected, sortedAll)
  console.log(`[segmentUsers] Step 6 (full fallback): ${selected.length}`)

  return { selected, expansionStage: "full_fallback" }
}

export const segmentUsers = async (parsedBrief) => {

  
  let customers
  try {
    const response = await axios.get(
      `${process.env.CAMPAIGNX_BASE_URL}/api/v1/get_customer_cohort`,
      {
        headers: { "X-API-Key": process.env.CAMPAIGNX_API_KEY },
        timeout: 10_000,
      }
    )
    customers = response.data.data
    if (!Array.isArray(customers) || customers.length === 0) {
      throw new Error("Empty or malformed customer list received")
    }
  } catch (e) {
    throw new Error(`[segmentUsers] Failed to fetch customers: ${e.message}`)
  }

  console.log(`[segmentUsers] Fetched ${customers.length} raw customers`)

  
  const classified = customers.map(c => ({ ...c, ...classifyCustomer(c) }))

  
  const { selected: expanded, expansionStage } = expandAudience(classified, parsedBrief)

 
  expanded.sort((a, b) => b.engagementScore - a.engagementScore)

  
  let selected = expanded
  if (parsedBrief.max_recipients > 0 && selected.length > parsedBrief.max_recipients) {
    const before = selected.length
    selected = selected.slice(0, parsedBrief.max_recipients)
    console.log(`[segmentUsers] Step 7 (cap): ${before} → ${selected.length} (max_recipients: ${parsedBrief.max_recipients})`)
  }

 
  const validSelected = selected.filter(c => {
    if (!c.customer_id) {
      console.warn(`[segmentUsers] Skipping customer with missing customer_id: ${c.Full_name ?? "unknown"}`)
      return false
    }
    return true
  })

  if (validSelected.length === 0) {
    throw new Error("[segmentUsers] No valid customers remain after all expansion steps — aborting campaign")
  }

 
  const customerIds = validSelected.map(c => c.customer_id)

  const segmentMap = Object.fromEntries(
    validSelected.map(c => [c.customer_id, {
      segment:         c.segment,
      tags:            c.tags,
      engagementScore: c.engagementScore,
      firstName:       c.Full_name?.split(" ")[0] ?? null,
    }])
  )

  const presentSegments = [...new Set(validSelected.map(c => c.segment))]

  const strategyHints = Object.fromEntries(
    presentSegments.map(seg => [seg, SEGMENT_STRATEGY[seg] ?? SEGMENT_STRATEGY.general])
  )

  const segmentStats = buildSegmentStats(validSelected)

  console.log(`[segmentUsers] ✓ Final recipient count: ${validSelected.length} (expansion stage: "${expansionStage}")`)
  console.log(`[segmentUsers] Segments present:`, presentSegments)
  console.log(`[segmentUsers] Segment stats:`, JSON.stringify(segmentStats, null, 2))

  return {
    customerIds,
    segmentMap,
    strategyHints,
    segmentStats,
    totalRecipients: validSelected.length,
    expansionStage,  
  }
}