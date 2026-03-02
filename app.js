document.addEventListener('DOMContentLoaded', () => {
    const briefInput = document.getElementById('briefInput');
    const generateBtn = document.getElementById('generateBtn');
    const btnText = generateBtn.querySelector('.btn-text');
    const loader = document.getElementById('generateLoader');
    const approvalsQueue = document.getElementById('approvalsQueue');
    const logsContainer = document.getElementById('agentLogs');

    // Dashboard metrics
    let currentOpenRate = 0;
    let currentClickRate = 0;

    function addLog(message, type = 'system') {
        const time = new Date().toLocaleTimeString();
        const el = document.createElement('div');
        el.className = `log-entry ${type}`;
        el.textContent = `[${time}] ${message}`;
        logsContainer.appendChild(el);
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }

    async function callGemini(prompt) {
        addLog('Calling Gemini AI...', 'system');
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.7, responseMimeType: "application/json" }
                })
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            const data = await response.json();

            let aiText = data.candidates[0].content.parts[0].text.trim();
            if (aiText.startsWith('```json')) {
                aiText = aiText.replace(/^```json/i, '').replace(/```$/, '').trim();
            }
            return JSON.parse(aiText);
        } catch (error) {
            addLog(`Error: ${error.message}`, 'error');
            return null;
        }
    }

    generateBtn.addEventListener('click', async () => {
        const brief = briefInput.value.trim();
        if (!brief) {
            addLog('Please enter a campaign brief.', 'error');
            return;
        }

        // Set Loading State
        btnText.style.display = 'none';
        loader.style.display = 'block';
        generateBtn.disabled = true;

        addLog(`Analyzing brief: "${brief.substring(0, 30)}..."`, 'agent');

        const systemPrompt = `
You are the CampaignX AI Agent. Your task is to process the following marketing brief for SuperBFSI and output STRICTLY a valid JSON array containing exactly 2 campaign variants for A/B testing.
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

        const campaigns = await callGemini(systemPrompt);

        if (campaigns && Array.isArray(campaigns)) {
            addLog(`Successfully generated ${campaigns.length} variants.`, 'success');
            renderApprovals(campaigns);
        } else {
            addLog("Failed to parse AI response into campaigns. Please try again.", "error");
        }

        // Reset Loading State
        btnText.style.display = 'block';
        loader.style.display = 'none';
        generateBtn.disabled = false;
    });

    function renderApprovals(campaigns) {
        approvalsQueue.innerHTML = '';

        campaigns.forEach((campaign, index) => {
            const card = document.createElement('div');
            card.className = 'campaign-card';

            card.innerHTML = `
                <div class="campaign-header">
                    <span class="campaign-badge">Variant ${index + 1}</span>
                    <span class="segment-info">${campaign.segment} • ${campaign.time}</span>
                </div>
                <div style="font-size: 0.8rem; color: #a1a1aa; margin-bottom: 0.5rem">Strategy: ${campaign.strategy}</div>
                <div class="campaign-content">
                    <strong>Subject:</strong> ${campaign.subject}<br><br>
                    ${campaign.body.replace(/\n/g, '<br>')}
                </div>
                <div class="card-actions">
                    <button class="btn-reject" onclick="this.closest('.campaign-card').remove()">Reject</button>
                    <button class="btn-approve" id="approve-${index}">Approve & Schedule</button>
                </div>
            `;
            approvalsQueue.appendChild(card);

            // Attach approve event
            card.querySelector(`#approve-${index}`).addEventListener('click', function () {
                this.textContent = 'Executing...';
                this.className = 'btn-approve';
                this.disabled = true;
                executeCampaign(campaign, card);
            });
        });
    }

    function executeCampaign(campaign, cardElement) {
        addLog(`Executing campaign: Variant addressing "${campaign.segment}"`, 'agent');

        // Simulating the dynamic API spec discovery and tool execution
        addLog("Discovering APIs via documentation...", 'system');
        addLog(`Discovered Endpoint: POST /api/v1/campaigns/schedule`, 'system');
        addLog(`Routing to SuperBFSI infrastructure...`, 'system');

        setTimeout(() => {
            addLog(`Campaign deployed successfully. Monitoring performance...`, 'success');
            cardElement.innerHTML = `
                <div style="text-align: center; color: var(--success); padding: 1rem;">
                    ✓ Campaign Active & Monitoring
                </div>
            `;
            simulateMetrics();
        }, 1500);
    }

    function simulateMetrics() {
        // Gamified metric simulation based on rulebook
        let iterations = 0;
        const interval = setInterval(() => {
            iterations++;
            // Random performance jumps (optimizing)
            currentOpenRate = Math.min(85, currentOpenRate + (Math.random() * 5));
            currentClickRate = Math.min(45, currentClickRate + (Math.random() * 3));

            document.getElementById('openRate').innerText = currentOpenRate.toFixed(1) + '%';
            document.getElementById('clickRate').innerText = currentClickRate.toFixed(1) + '%';

            if (iterations === 1) addLog("Early metrics arriving. Analyzing performance...", "agent");
            if (iterations === 3) addLog(`Current Open Rate: ${currentOpenRate.toFixed(1)}%. Strategy seems effective.`, "success");
            if (iterations === 5) {
                addLog(`Optimization complete for this cycle. Generating updated strategy...`, "system");
                clearInterval(interval);
                triggerAutonomousOptimization();
            }
        }, 2000);
    }

    async function triggerAutonomousOptimization() {
        addLog("Re-evaluating strategy based on initial cohort engagement...", "agent");
        const brief = "The initial campaign achieved good click rates but we need an alternative subject line to boost open rates further. Optimize for high open rate.";
        briefInput.value = brief;

        // Trigger a new generation automatically for human review
        setTimeout(() => { generateBtn.click(); }, 1500);
    }
});
