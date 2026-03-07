import axios from "axios"
import "dotenv/config"

const SEGMENT_STRATEGY = {
  vip_loyalist:           { subject_tone: "exclusive, appreciative",    content_focus: "premium offers, loyalty rewards",           send_frequency: "bi-weekly", best_send_time: "weekday mornings"   },
  at_risk_customer:       { subject_tone: "helpful, re-engagement",     content_focus: "KYC nudge, app install CTA, win-back offer", send_frequency: "weekly",    best_send_time: "weekday evenings"   },
  high_potential_prospect:{ subject_tone: "value-driven, aspirational", content_focus: "product benefits, sign-up incentive",        send_frequency: "weekly",    best_send_time: "weekday mornings"   },
  digital_native:         { subject_tone: "casual, punchy",             content_focus: "app features, referral program",             send_frequency: "2x weekly", best_send_time: "evenings & weekends"},
  entrepreneur_segment:   { subject_tone: "business-forward, ROI",      content_focus: "business account perks, cash-flow tools",    send_frequency: "weekly",    best_send_time: "weekday mornings"   },
  family_segment:         { subject_tone: "warm, protective",           content_focus: "family insurance, education savings",        send_frequency: "bi-weekly", best_send_time: "weekend mornings"   },
  mature_segment:         { subject_tone: "trustworthy, jargon-free",   content_focus: "retirement plans, fixed deposits",           send_frequency: "monthly",   best_send_time: "weekday mid-morning"},
  credit_rebuilder:       { subject_tone: "empathetic, constructive",   content_focus: "credit-builder products, financial literacy", send_frequency: "bi-weekly", best_send_time: "weekday evenings"   },
  salaried_mid_market:    { subject_tone: "practical, benefit-led",     content_focus: "savings accounts, SIPs, cashback cards",     send_frequency: "weekly",    best_send_time: "weekday mornings"   },
  general:                { subject_tone: "neutral, informative",       content_focus: "brand awareness, seasonal offers",           send_frequency: "bi-weekly", best_send_time: "weekday mornings"   },
}

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

  if (Number(customer.Kids_in_Household) > 0)       tags.add("has_kids")
  if (Number(customer["Dependent count"]) >= 3)     tags.add("high_dependents")
  if (Number(customer.Family_Size) === 1)            tags.add("single_household")
  if (Number(customer.Family_Size) >= 4)             tags.add("large_household")

  const occ = (customer.Occupation || "").toLowerCase()
  if      (["entrepreneur","business owner","self-employed"].some(v => occ.includes(v))) tags.add("entrepreneur")
  else if (["salaried","employee","executive"].some(v => occ.includes(v)))               tags.add("salaried")
  else if (["student"].some(v => occ.includes(v)))                                       tags.add("student")
  else if (["retired","homemaker"].some(v => occ.includes(v)))                           tags.add("retired_homemaker")

  if (customer["Occupation type"] === "Full-time") tags.add("fulltime")
  else if (customer["Occupation type"] === "Part-time") tags.add("parttime")

  const appInstalled     = customer.App_Installed      === "Y"
  const socialActive     = customer.Social_Media_Active === "Y"
  const kycDone          = customer["KYC status"]       === "Y"
  const existingCustomer = customer["Existing Customer"] === "Y"

  if (appInstalled && socialActive)        tags.add("highly_digital")
  else if (appInstalled || socialActive)   tags.add("moderately_digital")
  else                                     tags.add("low_digital")

  if (existingCustomer) tags.add("existing_customer")
  else                  tags.add("prospect")
  if (!kycDone)         tags.add("kyc_incomplete")

  if (customer.Gender === "Female")          tags.add("female")
  else if (customer.Gender === "Male")       tags.add("male")
  if (customer.Marital_Status === "Married") tags.add("married")

  let segment = "general"
  if      (tags.has("existing_customer") && tags.has("high_income")  && tags.has("prime_credit"))                             segment = "vip_loyalist"
  else if (tags.has("existing_customer") && tags.has("low_digital")  && tags.has("kyc_incomplete"))                           segment = "at_risk_customer"
  else if (tags.has("prospect")          && (tags.has("high_income") || tags.has("mid_income")) && tags.has("prime_credit"))  segment = "high_potential_prospect"
  else if ((tags.has("gen_z") || tags.has("millennial")) && tags.has("highly_digital"))                                       segment = "digital_native"
  else if (tags.has("entrepreneur"))                                                                                           segment = "entrepreneur_segment"
  else if (tags.has("has_kids") && (tags.has("mid_income") || tags.has("high_income")))                                       segment = "family_segment"
  else if (tags.has("senior")   || tags.has("boomer"))                                                                        segment = "mature_segment"
  else if (tags.has("poor_credit") || tags.has("subprime_credit"))                                                            segment = "credit_rebuilder"
  else if (tags.has("salaried") && tags.has("mid_income"))                                                                    segment = "salaried_mid_market"

  let score = 50
  if (appInstalled)              score += 15
  if (socialActive)              score += 10
  if (existingCustomer)         score += 10
  if (kycDone)                  score += 5
  if (tags.has("high_income"))  score += 10
  if (tags.has("prime_credit")) score += 5
  if (tags.has("low_digital"))  score -= 15
  if (tags.has("poor_credit"))  score -= 10
  score = Math.min(100, Math.max(0, score))

  return { segment, tags: [...tags], engagementScore: score }
}

const ALL_ALIASES = new Set([
  "all", "all customers", "all users", "all segments", "everyone",
  "entire base", "full list", "whole list", "no filter", "any", "*"
])

export const segmentUsers = async (parsedBrief) => {

  let customers
  try {
    const response = await axios.get(
      `${process.env.CAMPAIGNX_BASE_URL}/api/v1/get_customer_cohort`,
      { headers: { "X-API-Key": process.env.CAMPAIGNX_API_KEY } }
    )
    customers = response.data.data
    if (!Array.isArray(customers)) {
      throw new Error("Unexpected response shape — expected array")
    }
  } catch (e) {
    throw new Error(`[segmentUsers] Failed to fetch customers: ${e.message}`)
  }

  console.log(`[segmentUsers] fetched ${customers.length} customers`)

  const classified = customers.map(c => ({ ...c, ...classifyCustomer(c) }))

  const rawTarget        = parsedBrief.target_segment
  const normalizedTarget = typeof rawTarget === "string" ? rawTarget.toLowerCase().trim() : rawTarget
  const isAll            = !rawTarget || ALL_ALIASES.has(normalizedTarget)

  

  let selected
  if (isAll) {
    selected = classified
  } else if (Array.isArray(rawTarget)) {
    const targets = new Set(rawTarget.map(t => t.toLowerCase()))
    selected = classified.filter(c => targets.has(c.segment) || c.tags.some(t => targets.has(t)))
  } else {
    selected = classified.filter(c =>
      c.segment === normalizedTarget ||
      c.segment === rawTarget ||
      c.tags.includes(normalizedTarget)
    )
  }

  console.log(`[segmentUsers] selected ${selected.length} customers`)

  selected.sort((a, b) => b.engagementScore - a.engagementScore)

  if (parsedBrief.max_recipients > 0) {
    selected = selected.slice(0, parsedBrief.max_recipients)
  }

  const validSelected = selected.filter(c => {
    if (!c.customer_id) {
      console.warn(`[segmentUsers] skipping customer with missing customer_id:`, c.Full_name ?? "unknown")
      return false
    }
    return true
  })

  const customerIds = validSelected.map(c => c.customer_id)

  const segmentMap = Object.fromEntries(
    validSelected.map(c => [c.customer_id, {
      segment:         c.segment,
      tags:            c.tags,
      engagementScore: c.engagementScore,
      
    }])
  )

  const presentSegments = [...new Set(validSelected.map(c => c.segment))]
  const strategyHints   = Object.fromEntries(
    presentSegments.map(seg => [seg, SEGMENT_STRATEGY[seg] ?? SEGMENT_STRATEGY.general])
  )

  return { customerIds, segmentMap, strategyHints }
}