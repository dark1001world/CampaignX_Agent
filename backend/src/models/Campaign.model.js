import mongoose from "mongoose"

const campaignSchema = new mongoose.Schema(
  {
    temp_id: { type: String, required: true, unique: true, index: true },

    parsedBrief: { type: mongoose.Schema.Types.Mixed },
    campaign: { type: mongoose.Schema.Types.Mixed },
    customerIds: { type: [String], default: [] },
    segmentMap: { type: mongoose.Schema.Types.Mixed },
    strategyHints: { type: mongoose.Schema.Types.Mixed },
    variants: { type: mongoose.Schema.Types.Mixed, default: [] },
    testGroup: { type: [String], default: [] },
    fullGroup: { type: [String], default: [] },
    abTestResults: { type: mongoose.Schema.Types.Mixed, default: null },
    abMetrics: { type: mongoose.Schema.Types.Mixed, default: null },
    winner: { type: mongoose.Schema.Types.Mixed, default: null },

    status: {
      type: String,
      enum: [
        "PENDING_APPROVAL",
        "SENT",
        "OPTIMIZED",
        "OPTIMIZED_PENDING_APPROVAL",
        "AUTO_RELAUNCHED",
        "RELAUNCHED",
        "REJECTED"
      ],
      default: "PENDING_APPROVAL",
    },

    real_campaign_id: { type: String, default: null, index: true },
    send_time: { type: String, default: null },

    metrics: { type: mongoose.Schema.Types.Mixed, default: null },
    optimizedCampaign: { type: mongoose.Schema.Types.Mixed, default: null },

    version: { type: Number, default: 1 },
    reject_reason: { type: String, default: null },
  },
  { timestamps: true }
)

export const Campaign = mongoose.models.Campaign
  ?? mongoose.model("Campaign", campaignSchema)