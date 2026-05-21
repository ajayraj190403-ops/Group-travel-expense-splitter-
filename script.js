document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT & AUTO-SAVE ---
    let appData = JSON.parse(localStorage.getItem('tripHubPro')) || {
        people: [], 
        events: [], 
        ideas: [],  
        settings: { currency: '₹', round: false, darkMode: false }
    };

    const save = () => {
        localStorage.setItem('tripHubPro', JSON.stringify(appData));
        renderAll();
    };

    // Category Colors for Analytics
    const catColors = { '🍔 Food': '#fbbf24', '🚗 Transport': '#3b82f6', '🏨 Stay': '#8b5cf6', '🎟️ Activity': '#ec4899', '📦 Other': '#94a3b8', '💸 Settlement': '#10b981' };

    // --- DOM ELEMENTS ---
    const ui = {
        currencyDisplays: document.querySelectorAll('.currency-display'),
        currencySelect: document.getElementById('currencySelect'),
        roundToggle: document.getElementById('roundToggle'),
        darkModeToggle: document.getElementById('darkModeToggle'),
        copyBtn: document.getElementById('copyBtn'),
        pieChart: document.getElementById('pieChart'),
        categoryLegend: document.getElementById('categoryLegend')
    };

    const formatMoney = (amount) => {
        const val = appData.settings.round ? Math.round(amount) : amount;
        return `${appData.settings.currency}${val.toFixed(appData.settings.round ? 0 : 2)}`;
    };
    const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);
    const getPersonName = (id) => appData.people.find(p => p.id === id)?.name || 'Someone';

    // --- TAB SWITCHING ---
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.getAttribute('data-target')).classList.add('active');
        });
    });

    // --- CORE LOGIC: WHO OWES WHOM ---
    const getSettlements = () => {
        let balances = {};
        appData.people.forEach(p => balances[p.id] = 0);

        appData.events.forEach(ev => {
            if (ev.cost > 0 && ev.paidBy && ev.splitAmong && ev.splitAmong.length > 0) {
                if (balances[ev.paidBy] !== undefined) balances[ev.paidBy] += ev.cost;
                const splitAmount = ev.cost / ev.splitAmong.length;
                ev.splitAmong.forEach(id => {
                    if (balances[id] !== undefined) balances[id] -= splitAmount;
                });
            }
        });

        let debtors = [], creditors = [];
        for (let id in balances) {
            if (balances[id] < -0.01) debtors.push({ id, amount: Math.abs(balances[id]) });
            if (balances[id] > 0.01) creditors.push({ id, amount: balances[id] });
        }

        let transactions = [];
        let i = 0, j = 0;

        while (i < debtors.length && j < creditors.length) {
            let debtor = debtors[i], creditor = creditors[j];
            let amount = Math.min(debtor.amount, creditor.amount);
            transactions.push({ fromId: debtor.id, fromName: getPersonName(debtor.id), toId: creditor.id, toName: getPersonName(creditor.id), amount: amount });
            debtor.amount -= amount; creditor.amount -= amount;
            if (debtor.amount < 0.01) i++;
            if (creditor.amount < 0.01) j++;
        }
        return transactions;
    };

    // --- RENDER FUNCTIONS ---
    const renderAll = () => {
        renderSettings();
        renderPeople();
        renderEventForm();
        renderTimeline();
        renderSettlements();
        renderIdeas();
        renderAnalytics();
    };

    const renderSettings = () => {
        ui.currencySelect.value = appData.settings.currency;
        ui.roundToggle.checked = appData.settings.round;
        ui.currencyDisplays.forEach(el => el.textContent = appData.settings.currency);
        
        ui.darkModeToggle.checked = appData.settings.darkMode;
        if (appData.settings.darkMode) document.body.classList.add('dark-mode');
        else document.body.classList.remove('dark-mode');
    };

    const renderPeople = () => {
        const list = document.getElementById('peopleList');
        list.innerHTML = '';
        appData.people.forEach(p => {
            list.innerHTML += `<div class="list-item"><span>👤 ${p.name}</span><button class="remove-btn" onclick="removePerson('${p.id}')">✕</button></div>`;
        });
    };

    const renderEventForm = () => {
        const paidBySelect = document.getElementById('paidBySelect');
        const splitCheckboxes = document.getElementById('splitCheckboxes');
        if (appData.people.length > 0) {
            document.getElementById('paidByGroup').style.display = 'flex';
            document.getElementById('splitAmongGroup').style.display = 'flex';
            paidBySelect.innerHTML = appData.people.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
            splitCheckboxes.innerHTML = appData.people.map(p => `<div><input type="checkbox" id="chk_${p.id}" value="${p.id}" checked><label for="chk_${p.id}">${p.name}</label></div>`).join('');
        }
    };

    const renderTimeline = () => {
        const container = document.getElementById('timelineList');
        container.innerHTML = '';
        appData.events.forEach(ev => {
            const isSettlement = ev.category === '💸 Settlement';
            container.innerHTML += `
                <div class="timeline-item" style="${isSettlement ? 'border-left: 4px solid var(--success-color);' : ''}">
                    <button class="remove-btn" style="position:absolute; top:0.5rem; right:0.5rem; background:none; border:none; color:var(--danger-color); cursor:pointer;" onclick="removeEvent('${ev.id}')">✕</button>
                    <strong>${ev.name}</strong> - <span style="color:var(--success-color)">${formatMoney(ev.cost)}</span> <span style="font-size:0.75rem">${ev.category}</span>
                    <div class="timeline-meta">${ev.cost > 0 ? `Paid by: ${getPersonName(ev.paidBy)} | Split among ${ev.splitAmong.length}` : 'Pending cost...'}</div>
                </div>`;
        });
    };

    const renderSettlements = () => {
        const container = document.getElementById('settlementsList');
        const transactions = getSettlements();

        if (appData.people.length === 0) {
            container.innerHTML = '<p class="empty-state">Add people to begin.</p>';
            ui.copyBtn.disabled = true; return;
        }

        if (transactions.length === 0) {
            container.innerHTML = '<p class="empty-state">Everyone is settled up! 🎉</p>';
            ui.copyBtn.disabled = true;
        } else {
            container.innerHTML = transactions.map(t => `
                <div class="settlement-card">
                    <div>${t.fromName} owes ${t.toName}: <strong>${formatMoney(t.amount)}</strong></div>
                    <button class="mini-btn" onclick="markAsPaid('${t.fromId}', '${t.toId}', ${t.amount})">Settle Up</button>
                </div>
            `).join('');
            ui.copyBtn.disabled = false;
        }
    };

    const renderIdeas = () => {
        const container = document.getElementById('ideasList');
        container.innerHTML = '';
        [...appData.ideas].sort((a, b) => b.score - a.score).forEach(idea => {
            container.innerHTML += `
                <div class="idea-card">
                    <span>${idea.name}</span>
                    <div class="vote-controls">
                        <button class="vote-btn" onclick="voteIdea('${idea.id}', 1)">👍</button>
                        <span class="vote-score">${idea.score}</span>
                        <button class="vote-btn" onclick="voteIdea('${idea.id}', -1)">👎</button>
                        <button class="vote-btn" style="color:var(--danger-color); font-size:1rem; margin-left:0.5rem;" onclick="removeIdea('${idea.id}')">✕</button>
                    </div>
                </div>`;
        });
    };

    const renderAnalytics = () => {
        let catTotals = {};
        let grandTotal = 0;
        appData.events.forEach(ev => {
            if(ev.cost > 0 && ev.category !== '💸 Settlement') {
                catTotals[ev.category] = (catTotals[ev.category] || 0) + ev.cost;
                grandTotal += ev.cost;
            }
        });

        ui.categoryLegend.innerHTML = '';
        if (grandTotal === 0) {
            ui.pieChart.style.background = 'conic-gradient(var(--input-border) 0% 100%)';
            ui.categoryLegend.innerHTML = '<p style="color:var(--text-secondary)">No expenses logged yet.</p>';
            return;
        }

        let gradientString = [];
        let currentDeg = 0;
        for (const [cat, total] of Object.entries(catTotals)) {
            const percentage = (total / grandTotal) * 100;
            const color = catColors[cat] || '#94a3b8';
            gradientString.push(`${color} ${currentDeg}% ${currentDeg + percentage}%`);
            currentDeg += percentage;
            
            ui.categoryLegend.innerHTML += `<div class="legend-item"><div class="legend-color" style="background:${color}"></div>${cat} (${Math.round(percentage)}%)</div>`;
        }
        ui.pieChart.style.background = `conic-gradient(${gradientString.join(', ')})`;
    };

    // --- EVENT LISTENERS ---
    document.getElementById('addPersonBtn').addEventListener('click', () => {
        const input = document.getElementById('newPersonName');
        if (input.value.trim()) { appData.people.push({ id: generateId(), name: input.value.trim() }); input.value = ''; save(); }
    });

    document.getElementById('parsePlanBtn').addEventListener('click', () => {
        const text = document.getElementById('pastePlanInput').value;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        lines.forEach(line => { appData.events.push({ id: generateId(), name: line.trim(), cost: 0, category: '📦 Other', paidBy: null, splitAmong: [] }); });
        document.getElementById('pastePlanInput').value = '';
        save();
    });

    document.getElementById('addEventBtn').addEventListener('click', () => {
        if (appData.people.length === 0) return alert("Please add travelers first!");
        const name = document.getElementById('eventName').value.trim();
        const cost = parseFloat(document.getElementById('eventCost').value) || 0;
        const category = document.getElementById('eventCategory').value;
        const paidBy = document.getElementById('paidBySelect').value;
        const splitAmong = Array.from(document.querySelectorAll('#splitCheckboxes input:checked')).map(cb => cb.value);

        if (name && splitAmong.length > 0) {
            appData.events.push({ id: generateId(), name, cost, category, paidBy, splitAmong });
            document.getElementById('eventName').value = ''; document.getElementById('eventCost').value = ''; save();
        } else alert("Provide a name and select at least one person to split it with.");
    });

    document.getElementById('addIdeaBtn').addEventListener('click', () => {
        const input = document.getElementById('newIdeaInput');
        if (input.value.trim()) { appData.ideas.push({ id: generateId(), name: input.value.trim(), score: 0 }); input.value = ''; save(); }
    });

    // Settings Listeners
    ui.currencySelect.addEventListener('change', (e) => { appData.settings.currency = e.target.value; save(); });
    ui.roundToggle.addEventListener('change', (e) => { appData.settings.round = e.target.checked; save(); });
    ui.darkModeToggle.addEventListener('change', (e) => { appData.settings.darkMode = e.target.checked; save(); });

    // Sync Listeners
    document.getElementById('exportSyncBtn').addEventListener('click', async () => {
        const syncString = btoa(encodeURIComponent(JSON.stringify(appData)));
        try {
            await navigator.clipboard.writeText(syncString);
            const orig = document.getElementById('exportSyncBtn').textContent;
            document.getElementById('exportSyncBtn').textContent = 'Copied to Clipboard!';
            setTimeout(() => document.getElementById('exportSyncBtn').textContent = orig, 2500);
        } catch(e) { alert("Copy failed. Here is your code:\n\n" + syncString); }
    });

    document.getElementById('importSyncBtn').addEventListener('click', () => {
        const input = document.getElementById('importSyncInput').value;
        try {
            const importedData = JSON.parse(decodeURIComponent(atob(input)));
            if (importedData.people && importedData.events) { appData = importedData; save(); document.getElementById('importSyncInput').value = ''; alert('Trip synced successfully!'); }
            else throw new Error("Invalid format");
        } catch(e) { alert("Invalid Sync Code!"); }
    });

    ui.copyBtn.addEventListener('click', async () => {
        let text = `*Trip Settlement Breakdown* 💸\n\n`;
        getSettlements().forEach(t => { text += `👉 *${t.fromName}* owes *${t.toName}*: ${formatMoney(t.amount)}\n`; });
        try {
            await navigator.clipboard.writeText(text);
            const orig = ui.copyBtn.textContent; ui.copyBtn.textContent = 'Copied!'; setTimeout(() => ui.copyBtn.textContent = orig, 2500);
        } catch (err) { alert('Failed to copy text.'); }
    });

    // Global action helpers
    window.removePerson = (id) => { appData.people = appData.people.filter(p => p.id !== id); appData.events = appData.events.filter(e => e.paidBy !== id && !e.splitAmong.includes(id)); save(); };
    window.removeEvent = (id) => { appData.events = appData.events.filter(e => e.id !== id); save(); };
    window.removeIdea = (id) => { appData.ideas = appData.ideas.filter(i => i.id !== id); save(); };
    window.voteIdea = (id, val) => { const idea = appData.ideas.find(i => i.id === id); if(idea) idea.score += val; save(); };
    
    // Debt Resolution Feature
    window.markAsPaid = (fromId, toId, amount) => {
        if(confirm(`Mark ${formatMoney(amount)} as paid from ${getPersonName(fromId)} to ${getPersonName(toId)}?`)) {
            appData.events.push({ id: generateId(), name: `Settlement Payment`, cost: amount, category: '💸 Settlement', paidBy: fromId, splitAmong: [toId] });
            save();
        }
    };

    renderAll();
});
