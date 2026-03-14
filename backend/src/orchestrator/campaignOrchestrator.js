import crypto from "crypto"
import { interpretBrief } from "../agents/briefAgent.js"
import { segmentUsers } from "../agents/segmentationAgent.js"
import { generateCampaign } from "../agents/campaignAgent.js"
import { optimizeCampaign, optimizeAllVariants } from "../agents/optimizationAgent.js"
import { sendCampaign } from "../services/campaignService.js"
import { getCampaignReport } from "../services/reportService.js"
import { Campaign } from "../models/Campaign.model.js"
import "dotenv/config"

// FIX #3 — exported so controller can import it and stay in sync
export const MAX_OPTIMIZATION_ATTEMPTS = 3

const formatSendTime = (offsetMinutes = 15) => {
  const now = new Date()
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000
  const istTime = new Date(now.getTime() + istOffsetMs + offsetMinutes * 60 * 1000)
  const pad = (n) => String(n).padStart(2, "0")
  return `${pad(istTime.getUTCDate())}:${pad(istTime.getUTCMonth() + 1)}:${String(istTime.getUTCFullYear()).slice(-2)} ${pad(istTime.getUTCHours())}:${pad(istTime.getUTCMinutes())}:${pad(istTime.getUTCSeconds())}`
}

const formatSendTimeFromDate = (date) => {
  const pad = (n) => String(n).padStart(2, "0")
  return `${pad(date.getUTCDate())}:${pad(date.getUTCMonth() + 1)}:${String(date.getUTCFullYear()).slice(-2)} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
}

const resolveSegmentSendTime = (segment, strategyHints, baseOffsetMinutes = 15) => {
  const hint = strategyHints?.[segment]?.best_send_time ?? "weekday mornings"
  const now = new Date()
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000
  const istNow = new Date(now.getTime() + istOffsetMs)

  let targetTime = new Date(istNow.getTime() + baseOffsetMinutes * 60 * 1000)
  const hour = targetTime.getUTCHours()

  if (hint.includes("morning") && hour >= 12) {
    targetTime.setUTCDate(targetTime.getUTCDate() + 1)
    targetTime.setUTCHours(3, 30, 0, 0)
  } else if (hint.includes("evening") && hour < 15) {
    targetTime.setUTCHours(12, 30, 0, 0)
  } else if (hint.includes("mid-morning") && (hour < 4 || hour >= 7)) {
    targetTime.setUTCHours(5, 0, 0, 0)
  }

  if (hint.includes("weekend")) {
    const day = targetTime.getUTCDay()
    if (day !== 0 && day !== 6) {
      const daysUntilSat = (6 - day + 7) % 7 || 7
      targetTime = new Date(targetTime.getTime() + daysUntilSat * 86400000)
    }
  } else if (hint.includes("weekday")) {
    const day = targetTime.getUTCDay()
    if (day === 0 || day === 6) {
      const daysUntilMon = day === 0 ? 1 : 2
      targetTime = new Date(targetTime.getTime() + daysUntilMon * 86400000)
    }
  }

  return formatSendTimeFromDate(targetTime)
}

const splitAudience = (customerIds) => {
  const shuffled = [...customerIds].sort(() => Math.random() - 0.5)
  if (shuffled.length < 30) {
    console.warn(`[splitAudience] Audience too small (${shuffled.length}) for A/B test — skipping test split, sending to full group directly`)
    return {
      testGroup: shuffled,
      fullGroup: shuffled,
      skippedABTest: true,
    }
  }
  const testSize = Math.ceil(shuffled.length * 0.20)
  return {
    testGroup: shuffled.slice(0, testSize),
    fullGroup: shuffled.slice(testSize),
  }
}

const scoreVariant = (metrics) =>
  ((metrics?.click_rate ?? 0) * 0.70) + ((metrics?.open_rate ?? 0) * 0.30)

const meetsThreshold = (metrics) =>
  ((metrics?.click_rate ?? 0) * 0.70) + ((metrics?.open_rate ?? 0) * 0.30) >= 0.13

const FALLBACK_SEGMENT_ORDER = [
  "salaried_mid_market",
  "digital_native",
  "high_potential_prospect",
  "general",
]

const resolveVariantSegments = (target_segment, segmentStats) => {
  const isAll = !target_segment || target_segment === "all"
  const isArray = Array.isArray(target_segment)

  const ranked = Object.entries(segmentStats ?? {})
    .sort(([, a], [, b]) => b.count - a.count)
    .map(([seg]) => seg)

  if (!isAll && !isArray) {
    const primary = target_segment
    const fallbacks = FALLBACK_SEGMENT_ORDER.filter(s => s !== primary)
    return [primary, fallbacks[0], fallbacks[1]]
  }

  if (ranked.length === 0) return FALLBACK_SEGMENT_ORDER.slice(0, 3)

  const used = new Set(ranked)
  for (const f of FALLBACK_SEGMENT_ORDER) {
    if (ranked.length >= 3) break
    if (!used.has(f)) {
      ranked.push(f)
      used.add(f)
    }
  }

  return ranked.slice(0, 3)
}

const pollMetricsUntilReady = async (campaignId) => {
  console.log(`[poller] Fetching metrics for: ${campaignId}`)
  const metrics = await getCampaignReport(campaignId)
  if (!metrics || (metrics.delivered ?? 0) === 0) {
    throw new Error(`[poller] No metrics available for: ${campaignId}`)
  }
  console.log(`[poller] ✓ Metrics fetched`)
  return metrics
}

const resolveOptimalSendTime = (microSegment) => {
  const now = new Date()
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000
  const istNow = new Date(now.getTime() + istOffsetMs)

  const hourOffset = microSegment?.recommended_send_time_offset ?? 0
  let targetTime = new Date(istNow.getTime() + (20 + hourOffset * 60) * 60 * 1000)

  const sendDay = microSegment?.recommended_send_day ?? "any"

  if (sendDay === "weekend") {
    const day = targetTime.getUTCDay()
    if (day !== 0 && day !== 6) {
      const daysUntilSat = (6 - day + 7) % 7 || 7
      targetTime = new Date(targetTime.getTime() + daysUntilSat * 24 * 60 * 60 * 1000)
    }
  } else if (sendDay === "weekday") {
    const day = targetTime.getUTCDay()
    if (day === 0 || day === 6) {
      const daysUntilMon = day === 0 ? 1 : 2
      targetTime = new Date(targetTime.getTime() + daysUntilMon * 24 * 60 * 60 * 1000)
    }
  }

  return formatSendTimeFromDate(targetTime)
}


export const runCampaignPipeline = async (brief) => {
  console.log("[pipeline] Step 1: Interpreting brief...")
  const parsedBrief = await interpretBrief(brief)
  console.log("[pipeline] Parsed brief:", JSON.stringify(parsedBrief, null, 2))

  console.log("[pipeline] Step 2: Segmenting users...")
  let segmentResult = await segmentUsers(parsedBrief)

  if (segmentResult.customerIds.length === 0) {
    console.warn("[pipeline] No users matched — retrying with target_segment: 'all'")
    parsedBrief.target_segment = "all"
    segmentResult = await segmentUsers(parsedBrief)
  }

  if (segmentResult.customerIds.length === 0) {
    throw new Error("[pipeline] No eligible recipients found even after fallback to 'all'")
  }

  const { customerIds, segmentMap, strategyHints, segmentStats, totalRecipients } = segmentResult
  console.log(`[pipeline] ${totalRecipients} recipients across segments:`, Object.keys(segmentStats ?? {}))

  const [segA, segB, segC] = resolveVariantSegments(parsedBrief.target_segment, segmentStats)
  console.log(`[pipeline] Step 3: Generating 3 variants — A:${segA} B:${segB} C:${segC}`)

  const countForSegment = (seg) => segmentStats?.[seg]?.count ?? totalRecipients

  const [variantA, variantB, variantC] = await Promise.all([
    generateCampaign({ segment: segA, strategyHints, recipient_count: countForSegment(segA) }),
    generateCampaign({ segment: segB, strategyHints, recipient_count: countForSegment(segB) }),
    generateCampaign({ segment: segC, strategyHints, recipient_count: countForSegment(segC) }),
  ])

  const variants = [
    { id: "A", segment: segA, campaign: variantA },
    { id: "B", segment: segB, campaign: variantB },
    { id: "C", segment: segC, campaign: variantC },
  ]

  const splitResult = splitAudience(customerIds)
  const { testGroup, fullGroup } = splitResult
  const temp_id = crypto.randomUUID()

  await Campaign.create({
    temp_id,
    parsedBrief,
    variants,
    customerIds,
    testGroup,
    fullGroup,
    segmentMap,
    strategyHints,
    segmentStats,
    optimizationHistory: [],
    status: "PENDING_APPROVAL",
    version: 1,
  })

  console.log(`[pipeline] ✓ Campaign ready for approval — ID: ${temp_id}`)

  return {
    approval_required: true,
    campaign_id: temp_id,
    status: "PENDING_APPROVAL",
    segment_size: totalRecipients,
    test_group_size: testGroup.length,
    full_group_size: fullGroup.length,
    segments_used: { A: segA, B: segB, C: segC },
    variants,
    ab_test_skipped: splitResult.skippedABTest ?? false,
    ab_skip_reason: splitResult.skippedABTest
      ? `Audience too small (${totalRecipients}) — best variant will be sent to full group directly`
      : null
  }
}


export const approveCampaign = async (campaign_id, acceptedVariantIds = ["A", "B", "C"]) => {
  const doc = await Campaign.findOne({ temp_id: campaign_id })
  if (!doc) throw new Error("[approveCampaign] Campaign not found")
  if (doc.status !== "PENDING_APPROVAL") throw new Error(`[approveCampaign] Campaign already ${doc.status}`)
  if (!acceptedVariantIds?.length) throw new Error("[approveCampaign] At least one variant must be accepted")

  const acceptedVariants = doc.variants.filter(v => acceptedVariantIds.includes(v.id))
  if (acceptedVariants.length === 0)
    throw new Error(`[approveCampaign] No matching variant IDs: ${acceptedVariantIds}`)

  const perVariant = Math.ceil(doc.testGroup.length / acceptedVariants.length)
  console.log(`[approveCampaign] Sending ${acceptedVariants.length} variant(s) to 20% test group...`)

  const sendResults = await Promise.all(
    acceptedVariants.map((v, i) => {
      const group = doc.testGroup.slice(i * perVariant, (i + 1) * perVariant)
      if (group.length === 0) {
        console.warn(`[approveCampaign] Variant ${v.id} got empty group — skipping`)
        return Promise.resolve(null)
      }
      const send_time = resolveSegmentSendTime(v.segment, doc.strategyHints, 15)
      console.log(`[approveCampaign] Variant ${v.id} (${v.segment}) → send_time: ${send_time}`)
      return sendCampaign({ ...v.campaign, send_time }, group)
        .then(result => ({ id: v.id, campaign_id: result.campaign_id, recipient_count: group.length, send_time }))
    })
  )

  const validResults = sendResults.filter(Boolean)

  await Campaign.updateOne(
    { temp_id: campaign_id },
    { status: "AB_TEST_SENT", acceptedVariantIds, abTestResults: validResults }
  )

  setImmediate(() =>
    collectAbTestMetrics(campaign_id).catch(e =>
      console.error(`[approveCampaign] Auto metrics collection failed: ${e.message}`)
    )
  )

  return {
    message: `${validResults.length} variant(s) sent — autonomous monitoring started`,
    campaign_id,
    status: "AB_TEST_SENT",
    ab_test_results: validResults,
    test_group_size: doc.testGroup.length,
  }
}


export const collectAbTestMetrics = async (campaign_id) => {
  const doc = await Campaign.findOne({ temp_id: campaign_id })
  if (!doc) throw new Error("[collectMetrics] Campaign not found")
  if (doc.status !== "AB_TEST_SENT") throw new Error("[collectMetrics] A/B test not yet sent")
  if (!doc.abTestResults?.length) throw new Error("[collectMetrics] No A/B test results on record")

  console.log("[collectMetrics] Autonomously polling metrics for all variants...")

  const metricsResults = await Promise.all(
    doc.abTestResults.map(async (v) => {
      const metrics = await pollMetricsUntilReady(v.campaign_id)
      return { id: v.id, campaign_id: v.campaign_id, metrics, score: scoreVariant(metrics) }
    })
  )

  metricsResults.forEach(v =>
    console.log(`  Variant ${v.id}: score=${v.score.toFixed(4)} OR=${(v.metrics.open_rate * 100).toFixed(1)}% CR=${(v.metrics.click_rate * 100).toFixed(1)}%`)
  )

  const qualifiedVariants = metricsResults.filter(v => meetsThreshold(v.metrics))

  if (qualifiedVariants.length === 0) {
    console.log("[collectMetrics] No variant met threshold — running Gemini micro-segment optimization...")

    const bestVariant = metricsResults.reduce((best, curr) => curr.score > best.score ? curr : best)
    const bestCampaign = doc.variants.find(v => v.id === bestVariant.id)?.campaign

    if (!bestCampaign)
      throw new Error(`[collectMetrics] Cannot find campaign for variant ${bestVariant.id}`)

    const optimization = await optimizeCampaign(
      bestCampaign,
      bestVariant.metrics,
      doc.segmentMap
    )

    await Campaign.updateOne(
      { temp_id: campaign_id },
      {
        abMetrics: metricsResults,
        optimizationResult: optimization,
        status: "OPTIMIZATION_PENDING_APPROVAL",
      }
    )

    return {
      message: "Micro-segment optimization complete — awaiting human approval",
      campaign_id,
      status: "OPTIMIZATION_PENDING_APPROVAL",
      ab_metrics: metricsResults,
      overall_diagnosis: optimization.overall_diagnosis,
      micro_segments_found: optimization.micro_segments?.length ?? 0,
      variants_generated: optimization.variants?.length ?? 0,
      approval_required: true,
      optimization_preview: optimization.variants?.map(v => ({
        micro_segment: v.micro_segment,
        base_segment: v.base_segment,
        subject: v.campaign.subject,
        body: v.campaign.body,
        cta: v.campaign.cta,
        send_time: v.send_time,
        style: v.campaign.style_applied,
        tone: v.campaign.tone_applied,
      })),
    }
  }

  const winner = qualifiedVariants.reduce((best, curr) => curr.score > best.score ? curr : best)
  const winningVariant = doc.variants.find(v => v.id === winner.id)

  if (!winningVariant)
    throw new Error(`[collectMetrics] Winning variant ${winner.id} not found in doc`)

  console.log(`[collectMetrics] ✓ Winner: Variant ${winner.id} — awaiting human confirmation...`)

  await Campaign.updateOne(
    { temp_id: campaign_id },
    {
      abMetrics: metricsResults,
      winner: {
        id: winner.id,
        campaign_id: winner.campaign_id,
        metrics: winner.metrics,
        score: winner.score,
        campaign: winningVariant.campaign,
      },
      status: "WINNER_PENDING_CONFIRMATION",
    }
  )

  return {
    message: `Variant ${winner.id} selected as winner — awaiting human confirmation`,
    campaign_id,
    status: "WINNER_PENDING_CONFIRMATION",
    winner: {
      id: winner.id,
      score: winner.score,
      metrics: winner.metrics,
      campaign: winningVariant.campaign,
    },
    ab_metrics: metricsResults,
    auto_sent: false,
  }
}


export const confirmAndSendWinner = async (campaign_id) => {
  const doc = await Campaign.findOne({ temp_id: campaign_id })
  if (!doc) throw new Error("[confirmWinner] Campaign not found")
  if (doc.status === "WINNER_SENT") throw new Error("[confirmWinner] Winner already sent")
  if (doc.status !== "WINNER_PENDING_CONFIRMATION")
    throw new Error(`[confirmWinner] Campaign not ready for confirmation — current status: ${doc.status}`)
  if (!doc.winner?.campaign) throw new Error("[confirmWinner] No winner on record — collect metrics first")
  if (!doc.fullGroup?.length && !doc.testGroup?.length)
    throw new Error("[confirmWinner] No audience found — both fullGroup and testGroup are empty")

  const audienceToSend = doc.fullGroup?.length ? doc.fullGroup : doc.testGroup

  const send_time = formatSendTime(20)
  const result = await sendCampaign({ ...doc.winner.campaign, send_time }, audienceToSend)

  // FIX #1 — updateOne awaited before setImmediate fires so real_campaign_id
  // is guaranteed to be in DB before analyzeCampaign does findOne({ real_campaign_id })
  await Campaign.updateOne(
    { temp_id: campaign_id },
    {
      status: "WINNER_SENT",
      real_campaign_id: result.campaign_id,
      send_time,
    }
  )

  // Safe to fire now — DB write is confirmed
  setImmediate(() =>
    analyzeCampaign(result.campaign_id).catch(e =>
      console.error(`[confirmWinner] Auto analyze failed: ${e.message}`)
    )
  )

  console.log(`[confirmWinner] ✓ Winner sent to ${audienceToSend.length} recipients — ID: ${result.campaign_id}`)

  return {
    message: "Winner sent to full audience",
    campaign_id: result.campaign_id,
    status: "WINNER_SENT",
    full_audience_size: doc.fullGroup.length,
    winner_variant: doc.winner.id,
    send_time,
  }
}


export const approveAndRelaunchOptimized = async (campaign_id, approvedMicroSegments = "all") => {
  const doc = await Campaign.findOne({ temp_id: campaign_id })
  if (!doc) throw new Error("[relaunch] Campaign not found")
  if (doc.status !== "OPTIMIZATION_PENDING_APPROVAL")
    throw new Error("[relaunch] No optimization pending approval")
  if (!doc.optimizationResult?.variants?.length)
    throw new Error("[relaunch] No optimized variants found")

  const allVariants = doc.optimizationResult.variants
  const selectedVariants = approvedMicroSegments === "all"
    ? allVariants
    : allVariants.filter(v => approvedMicroSegments.includes(v.micro_segment))

  if (selectedVariants.length === 0)
    throw new Error(`[relaunch] No matching micro-segments: ${approvedMicroSegments}`)

  console.log(`[relaunch] Relaunching ${selectedVariants.length} micro-segment variant(s)...`)

  const sendResults = []

  for (const variant of selectedVariants) {
    const targetIds = Object.entries(doc.segmentMap ?? {})
      .filter(([, info]) => {
        const segmentMatch = variant.base_segment === "general" || info.segment === variant.base_segment
        const tagMatch = !variant.dominant_tags?.length ||
          variant.dominant_tags.some(tag => info.tags?.includes(tag))
        return segmentMatch && tagMatch
      })
      .map(([id]) => id)

    const audience = targetIds.length > 0 ? targetIds : doc.fullGroup

    if (!audience?.length) {
      console.warn(`[relaunch] No audience for "${variant.micro_segment}" — skipping`)
      continue
    }

    const send_time = variant.send_time ?? formatSendTime(25)

    try {
      const result = await sendCampaign({ ...variant.campaign, send_time }, audience)
      sendResults.push({
        micro_segment: variant.micro_segment,
        base_segment: variant.base_segment,
        campaign_id: result.campaign_id,
        sent: audience.length,
        send_time,
        subject: variant.campaign.subject,
        cta: variant.campaign.cta,
        style: variant.campaign.style_applied,
        tone: variant.campaign.tone_applied,
      })
      console.log(`[relaunch] ✓ "${variant.micro_segment}" → ${audience.length} recipients at ${send_time}`)
    } catch (e) {
      console.error(`[relaunch] Failed for "${variant.micro_segment}": ${e.message}`)
    }
  }

  if (sendResults.length === 0)
    throw new Error("[relaunch] All micro-segment sends failed")

  await Campaign.updateOne(
    { temp_id: campaign_id },
    {
      status: "RELAUNCHED",
      relaunchResults: sendResults,
      real_campaign_id: sendResults[0].campaign_id,
      all_relaunch_campaign_ids: sendResults.map(r => r.campaign_id),
      version: doc.version + 1,
    }
  )

  setImmediate(async () => {
    try {
      const allMetrics = await Promise.all(
        sendResults.map(r =>
          pollMetricsUntilReady(r.campaign_id)
            .then(m => ({ campaign_id: r.campaign_id, micro_segment: r.micro_segment, metrics: m }))
            .catch(e => {
              console.error(`[relaunch] Metrics failed for ${r.micro_segment}: ${e.message}`)
              return null
            })
        )
      )

      const validMetrics = allMetrics.filter(Boolean)
      if (validMetrics.length === 0) {
        console.error("[relaunch] No metrics returned for any micro-segment")
        return
      }

      const aggregated = {
        open_rate: validMetrics.reduce((s, m) => s + (m.metrics.open_rate ?? 0), 0) / validMetrics.length,
        click_rate: validMetrics.reduce((s, m) => s + (m.metrics.click_rate ?? 0), 0) / validMetrics.length,
        delivered: validMetrics.reduce((s, m) => s + (m.metrics.delivered ?? 0), 0),
      }

      console.log(`[relaunch] Aggregated metrics — OR: ${(aggregated.open_rate * 100).toFixed(1)}% CR: ${(aggregated.click_rate * 100).toFixed(1)}%`)
      await analyzeCampaign(sendResults[0].campaign_id, aggregated)
    } catch (e) {
      console.error(`[relaunch] Auto analyze failed: ${e.message}`)
    }
  })

  return {
    message: `${sendResults.length} micro-segment variant(s) relaunched`,
    campaign_id,
    status: "RELAUNCHED",
    relaunch_results: sendResults,
    total_reached: sendResults.reduce((sum, r) => sum + r.sent, 0),
  }
}


export const analyzeCampaign = async (real_campaign_id, preAggregatedMetrics = null) => {
  const doc = await Campaign.findOne({ real_campaign_id })
  if (!doc) throw new Error("[analyzeCampaign] Campaign not found")

  console.log(`[analyzeCampaign] Autonomously fetching final metrics for: ${real_campaign_id}`)

  const metrics = preAggregatedMetrics ?? await pollMetricsUntilReady(real_campaign_id)
  const score = scoreVariant(metrics)

  console.log(`[analyzeCampaign] Score: ${score.toFixed(4)} OR: ${(metrics.open_rate * 100).toFixed(1)}% CR: ${(metrics.click_rate * 100).toFixed(1)}%`)

  if (meetsThreshold(metrics)) {
    console.log(`[analyzeCampaign] ✓ Threshold met — campaign complete`)
    await Campaign.updateOne(
      { real_campaign_id },
      { metrics, status: "COMPLETED", finalScore: score }
    )
    return {
      message: "Campaign completed successfully",
      campaign_id: real_campaign_id,
      status: "COMPLETED",
      metrics,
      score,
      approval_required: false,
      optimized: false,
      attempts_remaining: 0,
    }
  }

  console.log(`[analyzeCampaign] Below threshold — running Gemini micro-segment optimization...`)

  const baseCampaign = doc.winner?.campaign ?? doc.variants?.[0]?.campaign
  if (!baseCampaign) throw new Error("[analyzeCampaign] No base campaign to optimize from")

  const attemptsSoFar = doc.optimizationHistory?.length ?? 0
  const attemptsRemaining = Math.max(0, MAX_OPTIMIZATION_ATTEMPTS - attemptsSoFar)

  if (attemptsRemaining === 0) {
    console.log(`[analyzeCampaign] Max optimization attempts (${MAX_OPTIMIZATION_ATTEMPTS}) reached — closing campaign`)
    await Campaign.updateOne(
      { real_campaign_id },
      { metrics, status: "COMPLETED", finalScore: score }
    )
    return {
      message: "Max optimization attempts reached — campaign closed",
      campaign_id: real_campaign_id,
      status: "COMPLETED",
      metrics,
      score,
      approval_required: false,
      max_reached: true,
      attempts_remaining: 0,
    }
  }

  const optimization = await optimizeCampaign(baseCampaign, metrics, doc.segmentMap)

  await Campaign.updateOne(
    { real_campaign_id },
    {
      metrics,
      optimizationResult: optimization,
      status: "OPTIMIZATION_PENDING_APPROVAL",
      $push: {
        optimizationHistory: {
          campaign_id: real_campaign_id,
          metrics,
          score,
          timestamp: new Date().toISOString(),
          micro_segments: optimization.micro_segments?.length ?? 0,
        }
      }
    }
  )

  return {
    message: "Below threshold — micro-segment optimization ready for approval",
    campaign_id: real_campaign_id,
    status: "OPTIMIZATION_PENDING_APPROVAL",
    metrics,
    score,
    overall_diagnosis: optimization.overall_diagnosis,
    micro_segments_found: optimization.micro_segments?.length ?? 0,
    variants_generated: optimization.variants?.length ?? 0,
    approval_required: true,
    attempts_remaining: attemptsRemaining,
    max_reached: false,
    optimization_preview: optimization.variants?.map(v => ({
      micro_segment: v.micro_segment,
      base_segment: v.base_segment,
      subject: v.campaign.subject,
      body: v.campaign.body,
      cta: v.campaign.cta,
      send_time: v.send_time,
      style: v.campaign.style_applied,
      tone: v.campaign.tone_applied,
    })),
  }
}


export const relaunchOptimizedCampaign = async (real_campaign_id) => {
  const doc = await Campaign.findOne({ real_campaign_id })
  if (!doc) throw new Error("[relaunch] Campaign not found")
  if (!doc.optimizationResult?.variants?.length)
    throw new Error("[relaunch] No optimization result found — run analyzeCampaign first")
  if (doc.status !== "OPTIMIZATION_PENDING_APPROVAL")
    throw new Error(`[relaunch] Campaign not pending optimization approval — status: ${doc.status}`)

  return approveAndRelaunchOptimized(doc.temp_id, "all")
}

export const approveOptimizedCampaign = async (campaign_id, approvedMicroSegments = "all") => {
  const doc = await Campaign.findOne({ temp_id: campaign_id })
  if (!doc) throw new Error("[approveOptimized] Campaign not found")
  if (!doc.optimizationResult?.variants?.length)
    throw new Error("[approveOptimized] No optimization result found")
  if (doc.status !== "OPTIMIZATION_PENDING_APPROVAL")
    throw new Error(`[approveOptimized] Campaign not pending optimization approval — status: ${doc.status}`)

  return approveAndRelaunchOptimized(campaign_id, approvedMicroSegments)
}

export const optimizeAndRetestWinner = async (campaign_id) => {
  const doc = await Campaign.findOne({ temp_id: campaign_id })
  if (!doc) throw new Error("[optimizeAndRetest] Campaign not found")
  if (doc.status !== "WINNER_PENDING_CONFIRMATION")
    throw new Error(`[optimizeAndRetest] Campaign not at winner confirmation — status: ${doc.status}`)
  if (!doc.winner?.campaign) throw new Error("[optimizeAndRetest] No winner on record")

  const winnerCampaign = doc.winner.campaign
  const winnerSegment = doc.variants?.find(v => v.id === doc.winner.id)?.segment ?? "general"

  console.log(`[optimizeAndRetest] Generating 2 challengers based on Variant ${doc.winner.id}...`)

  // Generate 2 challenger variants using the winner as base context
  const FALLBACK_SEGMENT_ORDER = ["salaried_mid_market", "digital_native", "high_potential_prospect", "general"]
  const challengerSegments = FALLBACK_SEGMENT_ORDER.filter(s => s !== winnerSegment).slice(0, 2)

  const [challengerB, challengerC] = await Promise.all([
    generateCampaign({
      segment: challengerSegments[0],
      strategyHints: doc.strategyHints,
      recipient_count: doc.segmentStats?.[challengerSegments[0]]?.count ?? doc.testGroup.length,
      base_campaign: winnerCampaign,  // pass winner as base so agent can build on it
    }),
    generateCampaign({
      segment: challengerSegments[1],
      strategyHints: doc.strategyHints,
      recipient_count: doc.segmentStats?.[challengerSegments[1]]?.count ?? doc.testGroup.length,
      base_campaign: winnerCampaign,
    }),
  ])

  const retestVariants = [
    { id: "A", segment: winnerSegment, campaign: winnerCampaign, isWinner: true },
    { id: "B", segment: challengerSegments[0], campaign: challengerB },
    { id: "C", segment: challengerSegments[1], campaign: challengerC },
  ]

  const perVariant = Math.ceil(doc.testGroup.length / 3)

  console.log(`[optimizeAndRetest] Sending retest variants to test group (${doc.testGroup.length})...`)

  const sendResults = await Promise.all(
    retestVariants.map((v, i) => {
      const group = doc.testGroup.slice(i * perVariant, (i + 1) * perVariant)
      if (!group.length) return Promise.resolve(null)
      const send_time = resolveSegmentSendTime(v.segment, doc.strategyHints, 15)
      return sendCampaign({ ...v.campaign, send_time }, group)
        .then(result => ({ id: v.id, campaign_id: result.campaign_id, recipient_count: group.length, send_time }))
    })
  )

  const validResults = sendResults.filter(Boolean)

  await Campaign.updateOne(
    { temp_id: campaign_id },
    {
      status: "AB_TEST_SENT",
      variants: retestVariants,
      abTestResults: validResults,
      // preserve previous winner info for reference
      previousWinner: doc.winner,
    }
  )

  // Autonomous metrics collection — same as original A/B flow
  setImmediate(() =>
    collectAbTestMetrics(campaign_id).catch(e =>
      console.error(`[optimizeAndRetest] Auto metrics collection failed: ${e.message}`)
    )
  )

  return {
    message: "Winner retest started — 3 variants sent to test group",
    campaign_id,
    status: "AB_TEST_SENT",
    ab_test_results: validResults,
    test_group_size: doc.testGroup.length,
    retest: true,
  }
}