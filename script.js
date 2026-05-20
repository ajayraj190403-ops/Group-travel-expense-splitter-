document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT & AUTO-SAVE ---
    let appData = JSON.parse(localStorage.getItem('tripHubData')) || {
        people: [], // {id, name}
        events: [], // {id, name, cost, paidBy, splitAmong: []}
        ideas: [],  // {id, name, score}
        settings: { currency: '₹', round: false }
    };

    const save = () => {
        localStorage.setItem('tripHubData', JSON.stringify(appData));
        renderAll();
    };

    // --- DOM ELEMENTS ---
    const ui = {
        currencyDisplays: document.querySelectorAll('.currency-display'),
        currencySelect: document.getElementById('currencySelect'),
        roundToggle: document.getElementById('roundToggle'),
        copyBtn: document.getElementById('copyBtn')
    };

    // --- UTILITIES ---
    const formatMoney = (amount) => {
        const val = appData.settings.round ? Math.round(amount) : amount;
        return `${appData.settings.currency}${val.toFixed(appData.settings.round ? 0 : 2)}`;
    };

    const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

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

        // Calculate Net Balances
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

        // Greedy Settlement Algorithm
        while (i < debtors.length && j < creditors.length) {
            let debtor = debtors[i];
            let creditor = creditors[j];
            let amount = Math.min(debtor.amount, creditor.amount);

            transactions.push({
                from: appData.people.find(p => p.id === debtor.id)?.name || 'Someone',
                to: appData.people.find(p => p.id === creditor.id)?.name || 'Someone',
                amount: amount
            });

            debtor.amount -= amount;
            creditor.amount -= amount;

            if (debtor.amount < 0.01) i++;
            if (creditor.amount < 0.01) j++;
        }
        return transactions;
    };

    // --- RENDER FUNCTIONS ---
    const renderAll = () => {
        renderPeople();
        renderEventForm();
        renderTimeline();
        renderSettlements();
        renderIdeas();
        renderSettings();
    };

    const renderSettings = () => {
        ui.currencySelect.value = appData.settings.currency;
        ui.roundToggle.checked = appData.settings.round;
        ui.currencyDisplays.forEach(el => el.textContent = appData.settings.currency);
    };

    const renderPeople = () => {
        const list = document.getElementById('peopleList');
        list.innerHTML = '';
        appData.people.forEach(p => {
            list.innerHTML += `<div class="list-item">
                <span>👤 ${p.name}</span>
                <button class="remove-btn" onclick="removePerson('${p.id}')">✕</button>
            </div>`;
        });
    };

    const renderEventForm = () => {
        const paidByGroup = document.getElementById('paidByGroup');
        const splitAmongGroup = document.getElementById('splitAmongGroup');
        const paidBySelect = document.getElementById('paidBySelect');
        const splitCheckboxes = document.getElementById('splitCheckboxes');

        if (appData.people.length > 0) {
            paidByGroup.style.display = 'flex';
            splitAmongGroup.style.display = 'flex';
            
            paidBySelect.innerHTML = appData.people.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
            splitCheckboxes.innerHTML = appData.people.map(p => `
                <div>
                    <input type="checkbox" id="chk_${p.id}" value="${p.id}" checked>
                    <label for="chk_${p.id}">${p.name}</label>
                </div>
            `).join('');
        } else {
            paidByGroup.style.display = 'none';
            splitAmongGroup.style.display = 'none';
        }
    };

    const renderTimeline = () => {
        const container = document.getElementById('timelineList');
        container.innerHTML = '';
        appData.events.forEach(ev => {
            const payer = appData.people.find(p => p.id === ev.paidBy)?.name || 'Unknown';
            container.innerHTML += `
                <div class="timeline-item">
                    <button class="delete-evt" onclick="removeEvent('${ev.id}')">✕</button>
                    <strong>${ev.name}</strong> - <span style="color:var(--success-color)">${formatMoney(ev.cost)}</span>
                    <div class="timeline-meta">Paid by: ${payer} | Split among ${ev.splitAmong.length}</div>
                </div>
            `;
        });
    };

    const renderSettlements = () => {
        const container = document.getElementById('settlementsList');
        const transactions = getSettlements();

        if (appData.people.length === 0) {
            container.innerHTML = '<p class="empty-state">Add people to begin.</p>';
            ui.copyBtn.disabled = true;
            return;
        }

        if (transactions.length === 0) {
            container.innerHTML = '<p class="empty-state">Everyone is settled up! 🎉</p>';
            ui.copyBtn.disabled = true;
        } else {
            container.innerHTML = transactions.map(t => `
                <div class="settlement-card">
                    ${t.from} owes ${t.to}: <strong>${formatMoney(t.amount)}</strong>
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
                </div>
            `;
        });
    };

    // --- EVENT LISTENERS & ACTIONS ---
    document.getElementById('addPersonBtn').addEventListener('click', () => {
        const input = document.getElementById('newPersonName');
        if (input.value.trim()) {
            appData.people.push({ id: generateId(), name: input.value.trim() });
            input.value = '';
            save();
        }
    });

    document.getElementById('addEventBtn').addEventListener('click', () => {
        if (appData.people.length === 0) return alert("Please add travelers first!");
        
        const name = document.getElementById('eventName').value.trim();
        const cost = parseFloat(document.getElementById('eventCost').value) || 0;
        const paidBy = document.getElementById('paidBySelect').value;
        
        const splitAmong = Array.from(document.querySelectorAll('#splitCheckboxes input:checked')).map(cb => cb.value);

        if (name && cost > 0 && splitAmong.length > 0) {
            appData.events.push({ id: generateId(), name, cost, paidBy, splitAmong });
            document.getElementById('eventName').value = '';
            document.getElementById('eventCost').value = '';
            save();
        } else {
            alert("Please provide an event name, a valid cost, and select at least one person to split it with.");
        }
    });

    document.getElementById('addIdeaBtn').addEventListener('click', () => {
        const input = document.getElementById('newIdeaInput');
        if (input.value.trim()) {
            appData.ideas.push({ id: generateId(), name: input.value.trim(), score: 0 });
            input.value = '';
            save();
        }
    });

    ui.currencySelect.addEventListener('change', (e) => {
        appData.settings.currency = e.target.value;
        save();
    });

    ui.roundToggle.addEventListener('change', (e) => {
        appData.settings.round = e.target.checked;
        save();
    });

    ui.copyBtn.addEventListener('click', async () => {
        const transactions = getSettlements();
        let text = `*Trip Settlement Breakdown* 💸\n\n`;
        transactions.forEach(t => { text += `👉 *${t.from}* owes *${t.to}*: ${formatMoney(t.amount)}\n`; });
        text += `\nPlease clear your dues!`;

        try {
            await navigator.clipboard.writeText(text);
            const orig = ui.copyBtn.textContent;
            ui.copyBtn.textContent = 'Copied to Clipboard!';
            setTimeout(() => ui.copyBtn.textContent = orig, 2500);
        } catch (err) { alert('Failed to copy text.'); }
    });

    // Global action helpers for inline onclicks
    window.removePerson = (id) => {
        appData.people = appData.people.filter(p => p.id !== id);
        appData.events = appData.events.filter(e => e.paidBy !== id && !e.splitAmong.includes(id));
        save();
    };
    window.removeEvent = (id) => { appData.events = appData.events.filter(e => e.id !== id); save(); };
    window.removeIdea = (id) => { appData.ideas = appData.ideas.filter(i => i.id !== id); save(); };
    window.voteIdea = (id, val) => { const idea = appData.ideas.find(i => i.id === id); if(idea) idea.score += val; save(); };

    // Initial render
    renderAll();
});
