import mongoose from "mongoose"

const campaignSchema = new mongoose.Schema(
  {
    temp_id: { type: String, required: true, unique: true, index: true },

    parsedBrief:        { type: mongoose.Schema.Types.Mixed },
    customerIds:        { type: [String], default: [] },
    segmentMap:         { type: mongoose.Schema.Types.Mixed },
    segmentStats:       { type: mongoose.Schema.Types.Mixed },
    strategyHints:      { type: mongoose.Schema.Types.Mixed },
    variants:           { type: mongoose.Schema.Types.Mixed, default: [] },
    testGroup:          { type: [String], default: [] },
    fullGroup:          { type: [String], default: [] },
    abTestResults:      { type: mongoose.Schema.Types.Mixed, default: null },
    abMetrics:          { type: mongoose.Schema.Types.Mixed, default: null },
    winner:             { type: mongoose.Schema.Types.Mixed, default: null },
    optimizationResult: { type: mongoose.Schema.Types.Mixed },
    optimizationHistory:{ type: [mongoose.Schema.Types.Mixed], default: [] },
    relaunchResults:    { type: mongoose.Schema.Types.Mixed, default: null },

    status: {
      type: String,
      enum: [
        "PENDING_APPROVAL",
        "AB_TEST_SENT",
        "COLLECTING_METRICS",          // intermediate — auto-step in progress
        "WINNER_PENDING_CONFIRMATION",
        "WINNER_SENT",
        "OPTIMIZATION_PENDING_APPROVAL",
        "RELAUNCHED",
        "COMPLETED",
        "REJECTED",
        "FAILED",                      // written when any setImmediate step crashes
      ],
      default: "PENDING_APPROVAL",
    },

    real_campaign_id:          { type: String, default: null, index: true },
    all_relaunch_campaign_ids: { type: [String], default: [] },
    send_time:                 { type: String, default: null },

    metrics:      { type: mongoose.Schema.Types.Mixed, default: null },
    finalScore:   { type: Number, default: null },       // written by analyzeCampaign on completion
    failureReason:{ type: String, default: null },       // written when status → FAILED

    version:      { type: Number, default: 1 },
    reject_reason:{ type: String, default: null },
  },
  { timestamps: true }
)

export const Campaign = mongoose.models.Campaign
  ?? mongoose.model("Campaign", campaignSchema)