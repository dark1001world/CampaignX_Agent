import "dotenv/config"
import axios from "axios"

// ── Qwen via NVIDIA API ───────────────────────────────────────────────────────
const callQwen = async (prompt) => {
  try {
    const response = await axios.post(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      {
        model: "qwen/qwen3.5-122b-a10b",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 16384,
        temperature: 0.60,
        top_p: 0.95,
        stream: false,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
          Accept: "application/json",
        },
        responseType: "json",
      }
    )

    const rawContent = response.data.choices[0].message.content

    try {
      const cleaned = rawContent
        .replace(/```json|```/gi, "")
        .replace(/^[^{]*/, "")
        .replace(/[^}]*$/, "")
        .trim()

      return JSON.parse(cleaned)
    } catch (e) {
      console.error("[optimizeCampaign] JSON parse failed:", rawContent?.slice(0, 300))
      throw new Error("Qwen returned invalid JSON")
    }

  } catch (e) {
    console.error("[callQwen] Status:", e.response?.status)
    console.error("[callQwen] Error body:", JSON.stringify(e.response?.data, null, 2))
    throw e
  }
}

const MAX_VARIANTS = 3

const buildSegmentSummary = (segmentMap) => {
  const perf = {}
  for (const [, info] of Object.entries(segmentMap ?? {})) {
    const seg = info.segment ?? "general"
    if (!perf[seg]) perf[seg] = { count: 0, totalScore: 0, tags: {} }
    perf[seg].count++
    perf[seg].totalScore += info.engagementScore ?? 50
    for (const tag of info.tags ?? []) {
      perf[seg].tags[tag] = (perf[seg].tags[tag] ?? 0) + 1
    }
  }
  return Object.entries(perf).map(([seg, data]) => ({
    segment: seg,
    count: data.count,
    engagementAvg: Math.round(data.totalScore / data.count),
    dominantTags: Object.entries(data.tags)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([tag]) => tag)
  }))
}

const calculateSendTime = (microSegment) => {
  const now = new Date()
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000
  const istNow = new Date(now.getTime() + istOffsetMs)
  const hourOffset = microSegment?.recommended_send_time_offset ?? 0
  let target = new Date(istNow.getTime() + (20 + hourOffset * 60) * 60 * 1000)
  const sendDay = microSegment?.recommended_send_day ?? "any"
  if (sendDay === "weekend") {
    const d = target.getUTCDay()
    if (d !== 0 && d !== 6) target = new Date(target.getTime() + ((6 - d + 7) % 7 || 7) * 86400000)
  } else if (sendDay === "weekday") {
    const d = target.getUTCDay()
    if (d === 0 || d === 6) target = new Date(target.getTime() + (d === 0 ? 1 : 2) * 86400000)
  }
  const pad = (n) => String(n).padStart(2, "0")
  return `${pad(target.getUTCDate())}:${pad(target.getUTCMonth() + 1)}:${String(target.getUTCFullYear()).slice(-2)} ${pad(target.getUTCHours())}:${pad(target.getUTCMinutes())}:${pad(target.getUTCSeconds())}`
}

// ─── MODE A: none of the 3 initial variants passed — re-generate all 3 ───────
export const optimizeAllVariants = async (variants, segmentMap) => {
  console.log("[optimizeCampaign] Mode A — re-optimizing all 3 variants (single Qwen call)")

  const segmentSummary = buildSegmentSummary(segmentMap)

  const variantSummary = variants.map(v => ({
    id: v.id,
    segment: v.segment,
    subject: v.campaign?.subject,
    body: v.campaign?.body,
    cta: v.campaign?.cta,
    open_rate: v.metrics?.open_rate ?? 0,
    click_rate: v.metrics?.click_rate ?? 0,
    score: ((v.metrics?.click_rate ?? 0) * 0.70) + ((v.metrics?.open_rate ?? 0) * 0.30)
  }))

  const prompt = `
You are a financial email marketing optimizer for SuperBFSI Term Deposit.

PRODUCT
- Returns up to 9% p.a, capital protected, DICGC insured
- Minimum ₹1000, tenure 6-36 months, 100% digital

SCORING FORMULA
score = (click_rate × 0.70) + (open_rate × 0.30)
Threshold to pass = 0.13

CURRENT VARIANTS (all failed threshold)
${JSON.stringify(variantSummary, null, 2)}

AUDIENCE SEGMENTS
${JSON.stringify(segmentSummary, null, 2)}

TASK
All 3 variants failed. Diagnose why each failed and generate exactly ${MAX_VARIANTS} improved email variants.
Each variant must target a distinct audience angle to maximize chance that at least one passes threshold.
You must substantially rewrite subject, body, and CTA — do not copy from the failed variants above.

Return ONLY this JSON (no extra text):
{
  "overall_diagnosis": "2-3 sentence summary of why all variants failed and what will be fixed",
  "variants": [
    {
      "micro_segment": "short descriptive name e.g. risk_averse_savers",
      "base_segment": "segment name from audience data",
      "diagnosis": "1 sentence — what specifically failed for this segment and what is being changed",
      "dominant_tags": ["tag1", "tag2"],
      "recommended_send_day": "weekday",
      "recommended_send_time_offset": 0,
      "campaign": {
        "subject": "max 60 chars — must differ from failed variants",
        "subject_alt": "alternative subject line",
        "preheader": "preview text",
        "body": "completely rewritten email body copy — do not reuse failed body",
        "cta": "call to action text",
        "style_applied": "e.g. data-driven",
        "tone_applied": "e.g. reassuring"
      }
    }
  ]
}

Rules:
- Exactly ${MAX_VARIANTS} variants in the array, no more
- Each variant must have a meaningfully different tone, angle, or segment focus
- Subject lines must be under 60 characters
- diagnosis field is shown to human reviewer before they approve — make it clear and useful
- overall_diagnosis is shown at the top of the approval gate UI
- Do NOT reuse subject lines, body copy, or CTAs from the failed variants above
`

  const parsed = await callQwen(prompt)

  if (!Array.isArray(parsed.variants) || parsed.variants.length === 0) {
    throw new Error("[optimizeCampaign] Qwen returned no variants array")
  }

  const capped = parsed.variants.slice(0, MAX_VARIANTS).map(v => ({
    micro_segment: v.micro_segment ?? "optimized",
    base_segment: v.base_segment ?? "general",
    dominant_tags: v.dominant_tags ?? [],
    diagnosis: v.diagnosis ?? "",
    send_time: calculateSendTime({
      recommended_send_day: v.recommended_send_day,
      recommended_send_time_offset: v.recommended_send_time_offset
    }),
    campaign: {
      subject: (() => {
        const s = (v.campaign?.subject ?? "").trim().slice(0, 60)
        if (!s) throw new Error(`[optimizeAllVariants] Qwen returned empty subject for variant ${v.micro_segment}`)
        return s
      })(),
      subject_alt: v.campaign?.subject_alt ?? "",
      preheader: v.campaign?.preheader ?? "",
      body: (() => {
        const b = (v.campaign?.body ?? "").trim()
        if (!b) throw new Error(`[optimizeAllVariants] Qwen returned empty body for variant ${v.micro_segment}`)
        return b
      })(),
      cta: (() => {
        const c = (v.campaign?.cta ?? "").trim()
        if (!c) throw new Error(`[optimizeAllVariants] Qwen returned empty CTA for variant ${v.micro_segment}`)
        return c
      })(),
      style_applied: v.campaign?.style_applied ?? "",
      tone_applied: v.campaign?.tone_applied ?? ""
    }
  }))

  console.log(`[optimizeCampaign] Mode A — ${capped.length} optimized variants ready`)

  return {
    overall_diagnosis: parsed.overall_diagnosis ?? "All variants underperformed — re-generated with distinct audience angles",
    micro_segments: capped.map(v => ({ name: v.micro_segment, base_segment: v.base_segment, dominant_tags: v.dominant_tags })),
    variants: capped,
    approval_required: true,
    mode: "all_variants"
  }
}

// ─── MODE B: winner sent to full audience, still below threshold — curate winner
export const optimizeCampaign = async (
  baseCampaign,
  metrics,
  segmentMap = {},
  optimizationHistory = []
) => {
  console.log(`[optimizeCampaign] Mode B — curating winner (attempt ${optimizationHistory.length + 1}) OR:${((metrics?.open_rate ?? 0) * 100).toFixed(1)}% CR:${((metrics?.click_rate ?? 0) * 100).toFixed(1)}%`)

  const segmentSummary = buildSegmentSummary(segmentMap)

  const historyContext = optimizationHistory.length > 0
    ? `
PREVIOUS FAILED OPTIMIZATION ATTEMPTS (${optimizationHistory.length} so far)
DO NOT repeat these micro-segment combinations or angles — they have already been tried and failed:
${JSON.stringify(optimizationHistory.map(h => ({
      attempt_number: optimizationHistory.indexOf(h) + 1,
      timestamp: h.timestamp,
      score_achieved: h.score,
      micro_segments_tried: h.micro_segments,
    })), null, 2)}
`
    : ""

  const prompt = `
You are a financial email marketing optimizer for SuperBFSI Term Deposit.

PRODUCT
- Returns up to 9% p.a, capital protected, DICGC insured
- Minimum ₹1000, tenure 6-36 months, 100% digital

SCORING FORMULA
score = (click_rate × 0.70) + (open_rate × 0.30)
Threshold to pass = 0.13

CURRENT WINNER CAMPAIGN (sent to full audience, still below threshold)
Subject: ${baseCampaign.subject}
Body: ${baseCampaign.body}
CTA: ${baseCampaign.cta}

FULL AUDIENCE METRICS
Open rate: ${((metrics?.open_rate ?? 0) * 100).toFixed(1)}%
Click rate: ${((metrics?.click_rate ?? 0) * 100).toFixed(1)}%
Score: ${(((metrics?.click_rate ?? 0) * 0.70) + ((metrics?.open_rate ?? 0) * 0.30)).toFixed(3)} (need > 0.13)

AUDIENCE SEGMENTS
${JSON.stringify(segmentSummary, null, 2)}
${historyContext}
TASK
The winning campaign underperformed with the full audience. Diagnose the problem and generate exactly ${MAX_VARIANTS} refined variants that target different sub-audiences within the full group.
You must substantially rewrite subject, body, and CTA — do not copy from the current winner above.
${optimizationHistory.length > 0 ? `This is attempt ${optimizationHistory.length + 1} — previous attempts failed, so try completely different angles.` : ""}

Return ONLY this JSON (no extra text):
{
  "overall_diagnosis": "2-3 sentence summary of why the winner underperformed and what will be fixed",
  "variants": [
    {
      "micro_segment": "short descriptive name",
      "base_segment": "segment name",
      "diagnosis": "1 sentence — what is being changed for this sub-audience and why",
      "dominant_tags": ["tag1", "tag2"],
      "recommended_send_day": "weekday",
      "recommended_send_time_offset": 0,
      "campaign": {
        "subject": "max 60 chars — must differ from current winner",
        "subject_alt": "alternative subject",
        "preheader": "preview text",
        "body": "completely rewritten email body — do not reuse winner body",
        "cta": "call to action",
        "style_applied": "style name",
        "tone_applied": "tone name"
      }
    }
  ]
}

Rules:
- Exactly ${MAX_VARIANTS} variants, no more
- Each must have a distinct tone or angle
- Subject lines under 60 characters
- diagnosis shown to human at approval gate — make it clear
- Do NOT reuse subject, body, or CTA from the current winner above
`

  const parsed = await callQwen(prompt)

  if (!Array.isArray(parsed.variants) || parsed.variants.length === 0) {
    throw new Error("[optimizeCampaign] Qwen returned no variants array")
  }

  const capped = parsed.variants.slice(0, MAX_VARIANTS).map(v => ({
    micro_segment: v.micro_segment ?? "optimized",
    base_segment: v.base_segment ?? "general",
    dominant_tags: v.dominant_tags ?? [],
    diagnosis: v.diagnosis ?? "",
    send_time: calculateSendTime({
      recommended_send_day: v.recommended_send_day,
      recommended_send_time_offset: v.recommended_send_time_offset
    }),
    campaign: {
      subject: (() => {
        const s = (v.campaign?.subject ?? "").trim().slice(0, 60)
        if (!s) throw new Error(`[optimizeCampaign] Qwen returned empty subject for ${v.micro_segment}`)
        return s
      })(),
      subject_alt: v.campaign?.subject_alt ?? "",
      preheader: v.campaign?.preheader ?? "",
      body: (() => {
        const b = (v.campaign?.body ?? "").trim()
        if (!b) throw new Error(`[optimizeCampaign] Qwen returned empty body for ${v.micro_segment}`)
        return b
      })(),
      cta: (() => {
        const c = (v.campaign?.cta ?? "").trim()
        if (!c) throw new Error(`[optimizeCampaign] Qwen returned empty CTA for ${v.micro_segment}`)
        return c
      })(),
      style_applied: v.campaign?.style_applied ?? "",
      tone_applied: v.campaign?.tone_applied ?? ""
    }
  }))

  console.log(`[optimizeCampaign] Mode B — ${capped.length} curated variants ready`)

  return {
    overall_diagnosis: parsed.overall_diagnosis ?? "Winner underperformed — curated with sub-audience targeting",
    micro_segments: capped.map(v => ({ name: v.micro_segment, base_segment: v.base_segment, dominant_tags: v.dominant_tags })),
    variants: capped,
    approval_required: true,
    mode: "winner_curation"
  }
}