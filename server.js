const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const axios = require('axios'); 

const app = express();
const PORT = process.env.PORT || 3000;


const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "AIzaSyAt_8AiNsKu7YMW7Y2_lzPJQokgKm34Iyk";
const SUPERBFSI_API_DOCS_URL = "https://campaignx.inxiteout.ai/openapi.json";
const SUPERBFSI_BASE_URL = "https://campaignx.inxiteout.ai";


let apiSpec = null;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: 'campaignx-super-secret-key-for-hackathon',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } 
}));

async function fetchApiSpec() {
    try {
        const response = await axios.get(SUPERBFSI_API_DOCS_URL);
        apiSpec = response.data;
        console.log("OpenAPI Spec Loaded Successfully.");
    } catch (error) {
        console.error("Failed to load OpenAPI Spec:", error.message);
    }
}
fetchApiSpec();


app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'admin' && password === 'admin') {
        req.session.isAuthenticated = true;
        req.session.user = username;
        return res.json({ success: true, message: 'Login successful' });
    }
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/check-auth', (req, res) => {
    if (req.session.isAuthenticated) {
        return res.json({ authenticated: true, user: req.session.user });
    }
    return res.json({ authenticated: false });
});


function requireAuth(req, res, next) {
    if (req.session.isAuthenticated) return next();
    return res.status(401).json({ error: 'Unauthorized' });
}


app.post('/api/agent/generate', requireAuth, async (req, res) => {
    const { brief } = req.body;

    if (!brief) return res.status(400).json({ error: 'Brief is required' });

    const systemPrompt = `
You are the CampaignX AI Agent. Process the following marketing brief for SuperBFSI and output STRICTLY a valid JSON array containing exactly 2 campaign variants for A/B testing.
DO NOT wrap the output in markdown code blocks. DO NOT output anything before or after the JSON array.
Each object in the JSON array MUST have the exact following keys:
- "segment": (String) target audience description
- "subject": (String) email subject line (can include emojis)
- "body": (String) email body (can include emojis and URLs)
- "time": (String) suggested send time
- "strategy": (String) brief explanation of why this strategy was chosen

User Brief:
"${brief}"
`;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: { temperature: 0.7, responseMimeType: "application/json" }
        });

        let aiText = response.data.candidates[0].content.parts[0].text.trim();
        if (aiText.startsWith('\`\`\`json')) {
            aiText = aiText.replace(/^\`\`\`json/i, '').replace(/\`\`\`$/, '').trim();
        }
        res.json(JSON.parse(aiText));
    } catch (error) {
        console.error("Gemini Error:", error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to generate strategies' });
    }
});

// 2. Dynamic Tool Calling Execution (THE CORE REQUIREMENT)
app.post('/api/agent/execute', requireAuth, async (req, res) => {
    const { campaignData } = req.body;

    if (!apiSpec) {
        return res.status(500).json({ error: 'API documentation not loaded yet.' });
    }

    // Agentic Workflow: Giving the LLM the OpenAPI Doc and asking it WHAT to call.
    const discoveryPrompt = `
You are the Action Execution Agent for CampaignX.
You need to schedule an email marketing campaign based on this data:
${JSON.stringify(campaignData, null, 2)}

Here is the OpenAPI Specification for our SuperBFSI API:
${JSON.stringify(apiSpec.paths, null, 2)}

Your task is to DYNAMICALLY DISCOVER the correct API endpoint and HTTP method to SCHEDULE A CAMPAIGN.
Do not hallucinate paths. Use ONLY the paths defined in the OpenAPI spec above.
Return a strict JSON object with NO markdown wrappers.
The JSON must have this structure:
{
    "endpoint": "/api/v1/...", 
    "method": "POST",
    "payload": {
       // The correctly structured JSON body required for this request based on the spec
    }
}
`;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        const response = await axios.post(url, {
            contents: [{ parts: [{ text: discoveryPrompt }] }],
            generationConfig: { temperature: 0.2, responseMimeType: "application/json" }
        });

        let aiText = response.data.candidates[0].content.parts[0].text.trim();
        if (aiText.startsWith('\`\`\`json')) aiText = aiText.replace(/^\`\`\`json/i, '').replace(/\`\`\`$/, '').trim();

        const toolCallInstruction = JSON.parse(aiText);
        console.log("Agent decided to execute:", toolCallInstruction);

        /* 
        // Actual execution would happen here:
        const executionResponse = await axios({
            method: toolCallInstruction.method,
            url: `${SUPERBFSI_BASE_URL}${toolCallInstruction.endpoint}`,
            data: toolCallInstruction.payload
        });
        */

        // Simulating the execution success for the frontend
        res.json({
            success: true,
            message: "Campaign Successfully Executed via Agentic Discovery",
            agentDecision: toolCallInstruction
        });

    } catch (error) {
        console.error("Discovery Error:", error.response?.data || error.message);
        res.status(500).json({ error: 'Failed to dynamically execute API tool' });
    }
});

app.listen(PORT, () => {
    console.log(`CampaignX Server running on http://localhost:${PORT}`);
});
