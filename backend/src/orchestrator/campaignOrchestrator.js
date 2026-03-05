import { interpretBrief } from "../agents/briefAgent.js";
import { segmentUsers } from "../agents/segmentationAgent.js";
import { generateCampaign } from "../agents/campaignAgent.js";
import { optimizeCampaign } from "../agents/optimizationAgent.js";
import { sendCampaign } from "../services/campaignService.js";
import { getCampaignReport } from "../services/reportService.js";
import "dotenv/config";

const formatSendTime = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 5); // ✅ 5 minutes in the future
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);
  const HH = String(now.getHours()).padStart(2, "0");
  const MM = String(now.getMinutes()).padStart(2, "0");
  const SS = String(now.getSeconds()).padStart(2, "0");
  return `${dd}:${mm}:${yy} ${HH}:${MM}:${SS}`;
};

export const runCampaignPipeline = async (brief) => {
  try {

    console.log("Step 1: Interpreting campaign brief...");
    const parsedBrief = await interpretBrief(brief);

    console.log("Step 2: Segmenting users...");
    const list_customer_ids = await segmentUsers(parsedBrief); // ✅ already returns IDs

    console.log("Step 3: Generating campaign...");
    const campaign = await generateCampaign(list_customer_ids);

    const send_time = formatSendTime();

    console.log("Payload being sent:", JSON.stringify({
      subject: campaign.subject,
      body: campaign.body,
      list_customer_ids: list_customer_ids.slice(0, 3),
      send_time
    }, null, 2));

    console.log("Step 4: Sending campaign...");
    const sendResult = await sendCampaign(
      { ...campaign, send_time },
      list_customer_ids
    );

    const campaign_id = sendResult.campaign_id;

    console.log("Step 5: Fetching campaign report...");
    const metrics = await getCampaignReport(campaign_id);

    console.log("Step 6: Optimizing campaign...");
    const improvedCampaign = await optimizeCampaign(campaign, metrics);

    return {
      parsedBrief,
      segment: list_customer_ids.length, // ✅ .length works on array of IDs
      campaign,
      campaign_id,
      metrics,
      improvedCampaign
    };

  } catch (error) {
    console.error("Pipeline failed:", error.response?.data || error.message);
    throw error;
  }
};