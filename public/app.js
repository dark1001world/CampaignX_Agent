document.addEventListener('DOMContentLoaded', () => {
    
    const authOverlay = document.getElementById('authOverlay');
    const appContent = document.getElementById('appContent');
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const logoutBtn = document.getElementById('logoutBtn');

    
    fetch('/api/check-auth')
        .then(res => res.json())
        .then(data => {
            if (data.authenticated) {
                showApp();
            } else {
                showLogin();
            }
        }).catch(() => showLogin());

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (data.success) {
                showApp();
                addLog(`User '${username}' logged in successfully.`, 'system');
            } else {
                loginError.textContent = data.message;
            }
        } catch (err) {
            loginError.textContent = "Server error. Please try again.";
        }
    });

    logoutBtn.addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        showLogin();
    });

    function showApp() {
        authOverlay.style.display = 'none';
        appContent.style.display = 'flex';
    }

    function showLogin() {
        authOverlay.style.display = 'flex';
        appContent.style.display = 'none';
        loginError.textContent = '';
    }

    
    const briefInput = document.getElementById('briefInput');
    const generateBtn = document.getElementById('generateBtn');
    const btnText = generateBtn.querySelector('.btn-text');
    const loader = document.getElementById('generateLoader');
    const approvalsQueue = document.getElementById('approvalsQueue');
    const logsContainer = document.getElementById('agentLogs');

   
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

    generateBtn.addEventListener('click', async () => {
        const brief = briefInput.value.trim();
        if (!brief) {
            addLog('Please enter a campaign brief.', 'error');
            return;
        }

        btnText.style.display = 'none';
        loader.style.display = 'block';
        generateBtn.disabled = true;

        addLog(`Analyzing brief via securely hosted Agent...`, 'agent');

        try {
            const response = await fetch('/api/agent/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brief })
            });

            if (!response.ok) {
                if (response.status === 401) {
                    showLogin();
                    throw new Error("Session expired. Please log in again.");
                }
                throw new Error("Failed to generate strategy.");
            }

            const campaigns = await response.json();

            if (campaigns && Array.isArray(campaigns)) {
                addLog(`Successfully generated ${campaigns.length} variants.`, 'success');
                renderApprovals(campaigns);
            } else {
                addLog("Invalid format returned from agent.", "error");
            }
        } catch (error) {
            addLog(`Error: ${error.message}`, 'error');
        }

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

    async function executeCampaign(campaign, cardElement) {
        addLog(`Executing campaign: Variant addressing "${campaign.segment}"`, 'agent');

        try {
            const response = await fetch('/api/agent/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ campaignData: campaign })
            });

            if (!response.ok) throw new Error("Agent failed to execute API.");

            const result = await response.json();

            const decision = result.agentDecision;
            addLog(`Agent Discovery: Identified dynamic endpoint: ${decision.method} ${decision.endpoint}`, 'system');

            addLog(`Campaign deployed successfully via dynamic endpoint routing.`, 'success');
            cardElement.innerHTML = `
                <div style="text-align: center; color: var(--success); padding: 1rem;">
                    ✓ Campaign Active & Monitoring
                </div>
            `;
            simulateMetrics();

        } catch (error) {
            addLog(`Execution Error: ${error.message}`, 'error');
            cardElement.innerHTML = `
                <div style="text-align: center; color: var(--danger); padding: 1rem;">
                    X Execution Failed
                </div>
            `;
        }
    }

    function simulateMetrics() {
        let iterations = 0;
        const interval = setInterval(() => {
            iterations++;
            currentOpenRate = Math.min(85, currentOpenRate + (Math.random() * 5));
            currentClickRate = Math.min(45, currentClickRate + (Math.random() * 3));

            document.getElementById('openRate').innerText = currentOpenRate.toFixed(1) + '%';
            document.getElementById('clickRate').innerText = currentClickRate.toFixed(1) + '%';

            if (iterations === 1) addLog("metrics arriving. Analyzing performance...", "agent");
            if (iterations === 3) addLog(`Current Open Rate: ${currentOpenRate.toFixed(1)}%. Strategy effective.`, "success");
            if (iterations === 5) {
                addLog(`Optimization cycle complete.`, "system");
                clearInterval(interval);
            }
        }, 2000);
    }
});
