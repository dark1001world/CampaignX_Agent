import crypto from "crypto"
import { interpretBrief }    from "../agents/briefAgent.js"
import { segmentUsers }      from "../agents/segmentationAgent.js"
import { generateCampaign }  from "../agents/campaignAgent.js"
import { optimizeCampaign }  from "../agents/optimizationAgent.js"
import { sendCampaign }      from "../services/campaignService.js"
import { getCampaignReport } from "../services/reportService.js"
import { Campaign }          from "../models/Campaign.model.js"
import "dotenv/config"

const formatSendTime = (offsetMinutes = 15) => {
  const now = new Date()
  const istOffsetMs = (5 * 60 + 30) * 60 * 1000
  const istTime = new Date(now.getTime() + istOffsetMs + offsetMinutes * 60 * 1000)
  const dd = String(istTime.getUTCDate()).padStart(2, "0")
  const mm = String(istTime.getUTCMonth() + 1).padStart(2, "0")
  const yy = String(istTime.getUTCFullYear()).slice(-2)
  const HH = String(istTime.getUTCHours()).padStart(2, "0")
  const MM = String(istTime.getUTCMinutes()).padStart(2, "0")
  const SS = String(istTime.getUTCSeconds()).padStart(2, "0")
  return `${dd}:${mm}:${yy} ${HH}:${MM}:${SS}`
}


const splitAudience = (customerIds) => {
  const shuffled  = [...customerIds].sort(() => Math.random() - 0.5)
  const testSize  = Math.ceil(shuffled.length * 0.20)
  const testGroup = shuffled.slice(0, testSize)
  const fullGroup = shuffled.slice(testSize)
  return { testGroup, fullGroup }
}


const scoreVariant = (metrics) => {
  const openRate  = metrics?.open_rate  ?? 0
  const clickRate = metrics?.click_rate ?? 0
  return (openRate * 0.4) + (clickRate * 0.6) 
}


// STEP 1-4: Interpret → Segment → Generate 3 Variants → Save

export const runCampaignPipeline = async (brief) => {

  console.log("Step 1: Interpreting brief...")
  const parsedBrief = await interpretBrief(brief)

  console.log("Step 2: Segmenting users...")
  let { customerIds, segmentMap, strategyHints } = await segmentUsers(parsedBrief)

  if (customerIds.length === 0) {
    console.warn("No users found — fallback to all segment")
    parsedBrief.target_segment = "all"
    ;({ customerIds, segmentMap, strategyHints } = await segmentUsers(parsedBrief))
  }

  console.log("Step 3: Generating 3 campaign variants...")
  const [variantA, variantB, variantC] = await Promise.all([
    generateCampaign({ segment: parsedBrief.target_segment, strategy: strategyHints, recipient_count: customerIds.length }),
    generateCampaign({ segment: parsedBrief.target_segment, strategy: strategyHints, recipient_count: customerIds.length }),
    generateCampaign({ segment: parsedBrief.target_segment, strategy: strategyHints, recipient_count: customerIds.length }),
  ])

  const variants = [
    { id: "A", campaign: variantA },
    { id: "B", campaign: variantB },
    { id: "C", campaign: variantC },
  ]

  // Split audience — 20% test group, 80% full group
  const { testGroup, fullGroup } = splitAudience(customerIds)

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
    status: "PENDING_APPROVAL",
    version: 1
  })

  console.log("Variants ready for approval:", temp_id)

  return {
    approval_required: true,
    campaign_id: temp_id,
    segment_size: customerIds.length,
    test_group_size: testGroup.length,
    full_group_size: fullGroup.length,
    variants
  }
}

// STEP 5-6: Human Approves → A/B/C Test Sent to 20% audience

export const approveCampaign = async (campaign_id) => {

  const doc = await Campaign.findOne({ temp_id: campaign_id })

  if (!doc) throw new Error("Campaign not found")
  if (doc.status !== "PENDING_APPROVAL")
    throw new Error(`Campaign already ${doc.status}`)

  console.log("Sending 3 variants to test group (20%)...")

  // Send each variant to a third of the test group
  const third     = Math.ceil(doc.testGroup.length / 3)
  const groupA    = doc.testGroup.slice(0, third)
  const groupB    = doc.testGroup.slice(third, third * 2)
  const groupC    = doc.testGroup.slice(third * 2)

  const send_time = formatSendTime(15)

  const [resultA, resultB, resultC] = await Promise.all([
    sendCampaign({ ...doc.variants[0].campaign, send_time }, groupA),
    sendCampaign({ ...doc.variants[1].campaign, send_time }, groupB),
    sendCampaign({ ...doc.variants[2].campaign, send_time }, groupC),
  ])

  const abTestResults = [
    { id: "A", campaign_id: resultA.campaign_id, recipient_count: groupA.length },
    { id: "B", campaign_id: resultB.campaign_id, recipient_count: groupB.length },
    { id: "C", campaign_id: resultC.campaign_id, recipient_count: groupC.length },
  ]

  await Campaign.updateOne(
    { temp_id: campaign_id },
    {
      status: "AB_TEST_SENT",
      abTestResults,
      send_time
    }
  )

  return {
    message: "A/B/C test sent to 20% audience",
    campaign_id,
    ab_test_results: abTestResults,
    test_group_size: doc.testGroup.length,
  }
}


// STEP 7-9: Collect Metrics → Score → AI Selects Best Variant

export const collectAbTestMetrics = async (campaign_id) => {

  const doc = await Campaign.findOne({ temp_id: campaign_id })

  if (!doc) throw new Error("Campaign not found")
  if (doc.status !== "AB_TEST_SENT")
    throw new Error("A/B test not yet sent")

  console.log("Collecting metrics for all variants...")

  // Fetch metrics for each variant
  const metricsResults = await Promise.all(
    doc.abTestResults.map(async (v) => {
      const metrics = await getCampaignReport(v.campaign_id)
      return { id: v.id, campaign_id: v.campaign_id, metrics, score: scoreVariant(metrics) }
    })
  )

  // AI selects winner — highest composite score
  const winner = metricsResults.reduce((best, curr) => curr.score > best.score ? curr : best)

  console.log("Variant scores:")
  metricsResults.forEach(v => console.log(`  Variant ${v.id}: score=${v.score.toFixed(4)} open=${v.metrics.open_rate} click=${v.metrics.click_rate}`))
  console.log(`Winner: Variant ${winner.id}`)

  // Get winning campaign content from variants
  const winningVariant = doc.variants.find(v => v.id === winner.id)

  await Campaign.updateOne(
    { temp_id: campaign_id },
    {
      abMetrics: metricsResults,
      winner: {
        id:          winner.id,
        campaign_id: winner.campaign_id,
        metrics:     winner.metrics,
        score:       winner.score,
        campaign:    winningVariant.campaign
      },
      status: "WINNER_PENDING_CONFIRMATION"
    }
  )

  return {
    message: `AI selected Variant ${winner.id} as winner`,
    campaign_id,
    ab_metrics: metricsResults,
    winner: {
      id:       winner.id,
      metrics:  winner.metrics,
      score:    winner.score,
      campaign: winningVariant.campaign
    },
    confirmation_required: true
  }
}


// STEP 10-11: Human Confirms → Send Winner to Full Audience

export const confirmAndSendWinner = async (campaign_id) => {

  const doc = await Campaign.findOne({ temp_id: campaign_id })

  if (!doc) throw new Error("Campaign not found")
  if (doc.status !== "WINNER_PENDING_CONFIRMATION")
    throw new Error("No winner pending confirmation")

  console.log(`Sending winning variant ${doc.winner.id} to full audience (80%)...`)

  const send_time = formatSendTime(20)

  const result = await sendCampaign(
    { ...doc.winner.campaign, send_time },
    doc.fullGroup
  )

  const real_campaign_id = result.campaign_id

  await Campaign.updateOne(
    { temp_id: campaign_id },
    {
      status: "WINNER_SENT",
      real_campaign_id,
      send_time
    }
  )

  return {
    message: `Variant ${doc.winner.id} sent to full audience`,
    campaign_id: real_campaign_id,
    winner_variant: doc.winner.id,
    full_audience_size: doc.fullGroup.length
  }
}

// STEP 12-14: Analyze Final → Optimize → Human Approval

export const analyzeCampaign = async (campaign_id) => {

  const doc = await Campaign.findOne({ real_campaign_id: campaign_id })

  if (!doc) throw new Error("Campaign not found")

  if (doc.version > 3) {
    return {
      message: "Max optimization attempts reached (3). Campaign closed.",
      metrics: doc.metrics,
      campaign_id,
      max_reached: true
    }
  }

  console.log(`Fetching final metrics... (attempt ${doc.version}/3)`)
  const metrics = await getCampaignReport(campaign_id)
  console.log("Metrics:", metrics)

  console.log("Running optimization agent...")
  const improvedCampaign = await optimizeCampaign(doc.winner?.campaign ?? doc.variants?.[0]?.campaign, metrics)

  const openRate     = metrics?.open_rate  ?? 0
  const clickRate    = metrics?.click_rate ?? 0
  const autoOptimize = openRate < 0.20 || clickRate < 0.05

  if (autoOptimize) {
    console.log("Performance low — auto relaunch triggered")

    let sendResult
    try {
      const send_time = formatSendTime(20)
      sendResult = await sendCampaign({ ...improvedCampaign, send_time }, doc.fullGroup ?? doc.customerIds)
    } catch (e) {
      throw new Error(`[analyzeCampaign] Auto-relaunch send failed: ${e.message}`)
    }

    await Campaign.updateOne(
      { real_campaign_id: campaign_id },
      {
        metrics,
        optimizedCampaign: improvedCampaign,
        status: "AUTO_RELAUNCHED",
        real_campaign_id: sendResult.campaign_id,
        version: doc.version + 1
      }
    )

    return {
      message: `Campaign auto optimized and relaunched (attempt ${doc.version}/3)`,
      campaign_id: sendResult.campaign_id,
      auto: true,
      attempts_remaining: 3 - doc.version
    }
  }

  await Campaign.updateOne(
    { real_campaign_id: campaign_id },
    {
      metrics,
      optimizedCampaign: improvedCampaign,
      status: "OPTIMIZED_PENDING_APPROVAL",
      version: doc.version + 1
    }
  )

  return {
    metrics,
    improvedCampaign,
    approval_required: true,
    attempts_remaining: 3 - doc.version
  }
}

// STEP 15-16: Human Approves → Relaunch Optimized Campaign

export const relaunchOptimizedCampaign = async (campaign_id) => {

  const doc = await Campaign.findOne({ real_campaign_id: campaign_id })

  if (!doc) throw new Error("Campaign not found")
  if (!doc.optimizedCampaign) throw new Error("Run analyzeCampaign first")
  if (doc.status === "RELAUNCHED" || doc.status === "AUTO_RELAUNCHED")
    throw new Error(`Campaign already ${doc.status}`)
  if (doc.version > 3)
    throw new Error("Max optimization attempts reached (3). Campaign closed.")

  const send_time = formatSendTime(25)

  console.log(`Relaunching optimized campaign... (attempt ${doc.version}/3)`)
  const result = await sendCampaign(
    { ...doc.optimizedCampaign, send_time },
    doc.fullGroup ?? doc.customerIds
  )

  await Campaign.updateOne(
    { real_campaign_id: campaign_id },
    {
      status: "RELAUNCHED",
      real_campaign_id: result.campaign_id,
      version: doc.version + 1
    }
  )

  return {
    message: `Optimized campaign relaunched (attempt ${doc.version}/3)`,
    campaign_id: result.campaign_id,
    attempts_remaining: 3 - doc.version
  }
}
