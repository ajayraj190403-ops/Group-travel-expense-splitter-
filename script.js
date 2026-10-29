document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT & AUTO-SAVE ---
    let appData = {};
    try {
        appData = JSON.parse(localStorage.getItem('tripHubPro')) || {};
    } catch (e) {
        appData = {};
    }

    if (!appData.tripTitle) appData.tripTitle = 'Custom Group Trip';
    if (appData.budget === undefined) appData.budget = 0;
    if (!Array.isArray(appData.people)) appData.people = [];
    if (!Array.isArray(appData.events)) appData.events = [];
    if (!Array.isArray(appData.ideas)) appData.ideas = [];
    if (!Array.isArray(appData.packingList)) {
        appData.packingList = [
            { id: 'p1', name: 'Passports / IDs', done: false },
            { id: 'p2', name: 'Phone Chargers & Power Banks', done: false }
        ];
    }
    if (!appData.settings) {
        appData.settings = { currency: '₹', round: false, darkMode: false };
    }

    let editingEventId = null;

    const save = () => {
        localStorage.setItem('tripHubPro', JSON.stringify(appData));
        renderAll();
    };

    const catColors = { '🍔 Food': '#fbbf24', '🚗 Transport': '#3b82f6', '🏨 Stay': '#8b5cf6', '🎟️ Activity': '#ec4899', '📦 Other': '#94a3b8', '💸 Settlement': '#10b981' };

    const ui = {
        currencyDisplays: document.querySelectorAll('.currency-display'),
        currencySelect: document.getElementById('currencySelect'),
        roundToggle: document.getElementById('roundToggle'),
        darkModeToggle: document.getElementById('darkModeToggle'),
        copyBtn: document.getElementById('copyBtn'),
        pieChart: document.getElementById('pieChart'),
        categoryLegend: document.getElementById('categoryLegend'),
        activeTripBanner: document.getElementById('activeTripBanner'),
        addEventBtn: document.getElementById('addEventBtn')
    };

    const formatMoney = (amount) => {
        const num = Number(amount) || 0;
        const val = appData.settings.round ? Math.round(num) : num;
        return `${appData.settings.currency}${val.toFixed(appData.settings.round ? 0 : 2)}`;
    };
    const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);
    const getPersonName = (id) => appData.people.find(p => p.id === id)?.name || 'Unknown';

    // --- TAB SWITCHING ---
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn, .tab-content').forEach(el => el.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.getAttribute('data-target')).classList.add('active');
        });
    });

    // --- PERSONAL SPEND & PAID CALCULATOR ---
    const getPersonalStats = () => {
        let stats = {};
        appData.people.forEach(p => { stats[p.id] = { paid: 0, share: 0 }; });

        appData.events.forEach(ev => {
            if (ev.cost > 0 && ev.category !== '💸 Settlement') {
                if (ev.paidBy && stats[ev.paidBy]) {
                    stats[ev.paidBy].paid += ev.cost;
                }
                if (ev.splitAmong && ev.splitAmong.length > 0) {
                    const splitVal = ev.cost / ev.splitAmong.length;
                    ev.splitAmong.forEach(memberId => {
                        if (stats[memberId]) stats[memberId].share += splitVal;
                    });
                }
            }
        });
        return stats;
    };

    // --- DIRECT PAIR-WISE DEBTS ---
    const getSettlements = () => {
        let debts = {};
        appData.people.forEach(p1 => {
            debts[p1.id] = {};
            appData.people.forEach(p2 => { debts[p1.id][p2.id] = 0; });
        });

        appData.events.forEach(ev => {
            if (ev.cost > 0 && ev.paidBy && ev.splitAmong && ev.splitAmong.length > 0) {
                const splitAmount = ev.cost / ev.splitAmong.length;
                ev.splitAmong.forEach(borrowerId => {
                    if (borrowerId !== ev.paidBy && debts[borrowerId] && debts[borrowerId][ev.paidBy] !== undefined) {
                        debts[borrowerId][ev.paidBy] += splitAmount;
                    }
                });
            }
        });

        let transactions = [];
        let processedPairs = new Set();

        appData.people.forEach(p1 => {
            appData.people.forEach(p2 => {
                if (p1.id === p2.id) return;
                const pairKey = [p1.id, p2.id].sort().join('-');
                if (processedPairs.has(pairKey)) return;
                processedPairs.add(pairKey);

                const p1OwesP2 = debts[p1.id][p2.id];
                const p2OwesP1 = debts[p2.id][p1.id];

                if (p1OwesP2 > p2OwesP1) {
                    const amount = p1OwesP2 - p2OwesP1;
                    if (amount > 0.01) transactions.push({ fromId: p1.id, fromName: p1.name, toId: p2.id, toName: p2.name, amount });
                } else if (p2OwesP1 > p1OwesP2) {
                    const amount = p2OwesP1 - p1OwesP2;
                    if (amount > 0.01) transactions.push({ fromId: p2.id, fromName: p2.name, toId: p1.id, toName: p1.name, amount });
                }
            });
        });

        return transactions;
    };

    // --- RENDER FUNCTIONS ---
    const renderAll = () => {
        ui.activeTripBanner.textContent = `✈️ Active Trip: ${appData.tripTitle}`;
        renderSettings();
        renderPeople();
        renderEventForm();
        renderBudget();
        renderTimeline();
        renderSettlements();
        renderIdeas();
        renderAnalytics();
        renderPackingList();
    };

    const renderSettings = () => {
        ui.currencySelect.value = appData.settings.currency;
        ui.roundToggle.checked = appData.settings.round;
        ui.currencyDisplays.forEach(el => el.textContent = appData.settings.currency);
        ui.darkModeToggle.checked = appData.settings.darkMode;
        document.body.classList.toggle('dark-mode', appData.settings.darkMode);
    };

    const renderPeople = () => {
        const list = document.getElementById('peopleList');
        const stats = getPersonalStats();
        list.innerHTML = '';

        appData.people.forEach(p => {
            const pStat = stats[p.id] || { paid: 0, share: 0 };
            list.innerHTML += `
                <div class="list-item">
                    <div>
                        <strong>👤 ${p.name}</strong>
                        <div class="person-meta">Paid Upfront: <strong>${formatMoney(pStat.paid)}</strong> | True Share: <strong>${formatMoney(pStat.share)}</strong></div>
                    </div>
                    <button type="button" class="remove-btn" onclick="removePerson('${p.id}')">✕</button>
                </div>`;
        });
    };

    const renderBudget = () => {
        const totalSpent = appData.events
            .filter(ev => ev.category !== '💸 Settlement')
            .reduce((sum, ev) => sum + (Number(ev.cost) || 0), 0);

        const spentText = document.getElementById('budgetSpentText');
        const limitText = document.getElementById('budgetLimitText');
        const barFill = document.getElementById('budgetBarFill');

        spentText.textContent = `Total Spent: ${formatMoney(totalSpent)}`;

        if (appData.budget > 0) {
            const pct = Math.min((totalSpent / appData.budget) * 100, 100);
            const rawPct = Math.round((totalSpent / appData.budget) * 100);
            limitText.textContent = `Cap: ${formatMoney(appData.budget)} (${rawPct}%)`;
            barFill.style.width = `${pct}%`;

            if (rawPct >= 100) barFill.style.backgroundColor = 'var(--danger-color)';
            else if (rawPct >= 75) barFill.style.backgroundColor = 'var(--warning-color)';
            else barFill.style.backgroundColor = 'var(--success-color)';
        } else {
            limitText.textContent = `Cap: Not Set`;
            barFill.style.width = `0%`;
        }
    };

    const renderPackingList = () => {
        const container = document.getElementById('packingList');
        container.innerHTML = '';
        appData.packingList.forEach(item => {
            container.innerHTML += `
                <div class="packing-item ${item.done ? 'done' : ''}">
                    <div style="display:flex; align-items:center;">
                        <input type="checkbox" style="width: 1.15rem; height: 1.15rem; margin-right: 0.65rem;" ${item.done ? 'checked' : ''} onchange="togglePacking('${item.id}', this.checked)">
                        <span class="item-name">${item.name}</span>
                    </div>
                    <button type="button" class="remove-btn" onclick="removePacking('${item.id}')">✕</button>
                </div>`;
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
        } else {
            document.getElementById('paidByGroup').style.display = 'none';
            document.getElementById('splitAmongGroup').style.display = 'none';
        }
    };

    const renderTimeline = () => {
        const container = document.getElementById('timelineList');
        container.innerHTML = '';

        if (appData.events.length === 0) {
            container.innerHTML = '<p class="empty-state">No timeline events or expenses yet.</p>';
            return;
        }

        appData.events.forEach(ev => {
            const isSettlement = ev.category === '💸 Settlement';
            let metaText = `<span>Planned slot (₹0 logged)</span> <button type="button" class="mini-btn no-print" onclick="loadPlannedEvent('${ev.id}')">+ Log Cost</button>`;

            if (isSettlement) {
                const payerName = getPersonName(ev.paidBy);
                const receiverName = getPersonName(ev.splitAmong[0]);
                metaText = `<span>✅ Direct Settlement: <strong>${payerName}</strong> paid <strong>${receiverName}</strong></span>`;
            } else if (ev.cost > 0) {
                const splitNames = (ev.splitAmong || []).map(id => getPersonName(id)).join(', ');
                metaText = `<span>Paid by: <strong>${getPersonName(ev.paidBy)}</strong> | Split with: ${splitNames}</span>`;
            }

            container.innerHTML += `
                <div class="timeline-item ${isSettlement ? 'settlement-item' : ''}">
                    <button type="button" class="remove-btn" style="position:absolute; top:0.4rem; right:0.4rem;" onclick="removeEvent('${ev.id}')">✕</button>
                    <strong>${ev.name}</strong> - <span style="color:var(--success-color); font-weight:700;">${formatMoney(ev.cost)}</span> <span style="font-size:0.75rem">${ev.category}</span>
                    <div class="timeline-meta">${metaText}</div>
                </div>`;
        });
    };

    const renderSettlements = () => {
        const container = document.getElementById('settlementsList');
        const transactions = getSettlements();

        if (appData.people.length === 0) {
            container.innerHTML = '<p class="empty-state">Add travelers above to begin.</p>';
            ui.copyBtn.disabled = true; return;
        }

        if (transactions.length === 0) {
            container.innerHTML = '<p class="empty-state">Everyone is 100% settled up! 🎉</p>';
            ui.copyBtn.disabled = true;
        } else {
            container.innerHTML = transactions.map(t => `
                <div class="settlement-card">
                    <div>
                        <strong>${t.fromName}</strong> owes <strong>${t.toName}</strong>
                        <div style="font-size:1rem; color:var(--success-color); font-weight:800;">${formatMoney(t.amount)}</div>
                    </div>
                    <button type="button" class="mini-btn" onclick="markAsPaid('${t.fromId}', '${t.toId}', ${t.amount})">
                        Settle: ${t.fromName} ➔ ${t.toName}
                    </button>
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
                        <button type="button" class="vote-btn" onclick="voteIdea('${idea.id}', 1)">👍</button>
                        <span class="vote-score">${idea.score}</span>
                        <button type="button" class="vote-btn" onclick="voteIdea('${idea.id}', -1)">👎</button>
                        <button type="button" class="remove-btn" onclick="removeIdea('${idea.id}')">✕</button>
                    </div>
                </div>`;
        });
    };

    const renderAnalytics = () => {
        let catTotals = {}, grandTotal = 0;
        appData.events.forEach(ev => {
            if (ev.cost > 0 && ev.category !== '💸 Settlement') {
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

        let gradientString = [], currentDeg = 0;
        for (const [cat, total] of Object.entries(catTotals)) {
            const pct = (total / grandTotal) * 100;
            const color = catColors[cat] || '#94a3b8';
            gradientString.push(`${color} ${currentDeg}% ${currentDeg + pct}%`);
            currentDeg += pct;
            ui.categoryLegend.innerHTML += `<div class="legend-item"><div class="legend-color" style="background:${color}"></div>${cat}: ${formatMoney(total)} (${Math.round(pct)}%)</div>`;
        }
        ui.pieChart.style.background = `conic-gradient(${gradientString.join(', ')})`;
    };

    // --- EVENT LISTENERS ---
    document.getElementById('setBudgetBtn').addEventListener('click', () => {
        const val = parseFloat(document.getElementById('budgetInput').value);
        if (!isNaN(val) && val >= 0) {
            appData.budget = val;
            document.getElementById('budgetInput').value = '';
            save();
        }
    });

    document.getElementById('exportPdfBtn').addEventListener('click', () => {
        window.print();
    });

    document.getElementById('rouletteBtn').addEventListener('click', () => {
        if (appData.people.length === 0) return alert("Add travelers first!");
        const resultDiv = document.getElementById('rouletteResult');
        let counter = 0;
        document.getElementById('rouletteBtn').disabled = true;
        const interval = setInterval(() => {
            const randomPerson = appData.people[Math.floor(Math.random() * appData.people.length)];
            resultDiv.textContent = randomPerson.name;
            if (++counter > 18) {
                clearInterval(interval);
                resultDiv.innerHTML = `🎉 <strong>${resultDiv.textContent}</strong> pays next!`;
                document.getElementById('rouletteBtn').disabled = false;
            }
        }, 65);
    });

    document.getElementById('addPackingBtn').addEventListener('click', () => {
        const input = document.getElementById('newPackingInput');
        if (input.value.trim()) {
            appData.packingList.push({ id: generateId(), name: input.value.trim(), done: false });
            input.value = ''; save();
        }
    });

    document.getElementById('addPersonBtn').addEventListener('click', () => {
        const input = document.getElementById('newPersonName');
        if (input.value.trim()) {
            appData.people.push({ id: generateId(), name: input.value.trim() });
            input.value = ''; save();
        }
    });

    document.getElementById('parsePlanBtn').addEventListener('click', () => {
        const text = document.getElementById('pastePlanInput').value;
        text.split('\n').filter(l => l.trim() !== '').forEach(line => {
            appData.events.push({ id: generateId(), name: line.trim(), cost: 0, category: '📦 Other', paidBy: null, splitAmong: [] });
        });
        document.getElementById('pastePlanInput').value = ''; save();
    });

    ui.addEventBtn.addEventListener('click', () => {
        const name = document.getElementById('eventName').value.trim();
        const cost = parseFloat(document.getElementById('eventCost').value) || 0;
        const category = document.getElementById('eventCategory').value;

        if (!name) return alert("Please enter an event or expense name.");

        if (cost > 0 && appData.people.length === 0) {
            return alert("Please add travelers in the Settle tab before logging a paid expense!");
        }

        const paidBy = appData.people.length > 0 ? document.getElementById('paidBySelect').value : null;
        const splitAmong = appData.people.length > 0 
            ? Array.from(document.querySelectorAll('#splitCheckboxes input:checked')).map(cb => cb.value) 
            : [];

        if (cost > 0 && splitAmong.length === 0) {
            return alert("Select at least one person to split this cost with.");
        }

        if (editingEventId) {
            const target = appData.events.find(e => e.id === editingEventId);
            if (target) {
                target.name = name;
                target.cost = cost;
                target.category = category;
                target.paidBy = paidBy;
                target.splitAmong = splitAmong;
            }
            editingEventId = null;
            ui.addEventBtn.textContent = 'Save to Timeline';
        } else {
            appData.events.push({ id: generateId(), name, cost, category, paidBy, splitAmong });
        }

        document.getElementById('eventName').value = '';
        document.getElementById('eventCost').value = '';
        save();
    });

    document.getElementById('addIdeaBtn').addEventListener('click', () => {
        const input = document.getElementById('newIdeaInput');
        if (input.value.trim()) {
            appData.ideas.push({ id: generateId(), name: input.value.trim(), score: 0 });
            input.value = ''; save();
        }
    });

    ui.currencySelect.addEventListener('change', (e) => { appData.settings.currency = e.target.value; save(); });
    ui.roundToggle.addEventListener('change', (e) => { appData.settings.round = e.target.checked; save(); });
    ui.darkModeToggle.addEventListener('change', (e) => { appData.settings.darkMode = e.target.checked; save(); });

    document.getElementById('exportSyncBtn').addEventListener('click', async () => {
        const syncString = btoa(encodeURIComponent(JSON.stringify(appData)));
        try {
            await navigator.clipboard.writeText(syncString);
            const btn = document.getElementById('exportSyncBtn');
            btn.textContent = 'Copied Sync Code!';
            setTimeout(() => btn.textContent = 'Copy Sync Code', 2500);
        } catch(e) { alert("Sync Code:\n\n" + syncString); }
    });

    document.getElementById('importSyncBtn').addEventListener('click', () => {
        const input = document.getElementById('importSyncInput').value.trim();
        try {
            const importedData = JSON.parse(decodeURIComponent(atob(input)));
            if (importedData.people && importedData.events) {
                appData = importedData; save();
                document.getElementById('importSyncInput').value = '';
                alert('Trip synced successfully!');
            } else throw new Error();
        } catch(e) { alert("Invalid Sync Code!"); }
    });

    ui.copyBtn.addEventListener('click', async () => {
        let text = `*${appData.tripTitle} - Settlement* 💸\n\n`;
        getSettlements().forEach(t => { text += `👉 *${t.fromName}* owes *${t.toName}*: ${formatMoney(t.amount)}\n`; });
        try {
            await navigator.clipboard.writeText(text);
            ui.copyBtn.textContent = 'Copied!';
            setTimeout(() => ui.copyBtn.textContent = 'Copy Settlement to WhatsApp', 2500);
        } catch (err) { alert('Failed to copy.'); }
    });

    // Global Action Helpers
    window.removePerson = (id) => { appData.people = appData.people.filter(p => p.id !== id); appData.events = appData.events.filter(e => e.paidBy !== id && !(e.splitAmong || []).includes(id)); save(); };
    window.removeEvent = (id) => { appData.events = appData.events.filter(e => e.id !== id); save(); };
    window.removeIdea = (id) => { appData.ideas = appData.ideas.filter(i => i.id !== id); save(); };
    window.voteIdea = (id, val) => { const idea = appData.ideas.find(i => i.id === id); if(idea) idea.score += val; save(); };
    window.togglePacking = (id, isDone) => { const item = appData.packingList.find(i => i.id === id); if (item) item.done = isDone; save(); };
    window.removePacking = (id) => { appData.packingList = appData.packingList.filter(i => i.id !== id); save(); };

    // Load a ₹0 planned day into the Expense Form to log its cost
    window.loadPlannedEvent = (id) => {
        const ev = appData.events.find(e => e.id === id);
        if (!ev) return;
        editingEventId = id;
        document.getElementById('eventName').value = ev.name;
        document.getElementById('eventCategory').value = ev.category || '🎟️ Activity';
        ui.addEventBtn.textContent = 'Update Planned Item Cost';
        document.getElementById('expenseFormSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
        document.getElementById('eventCost').focus();
    };

    // EXPLICIT NAMED DEBT RESOLUTION
    window.markAsPaid = (fromId, toId, amount) => {
        const payerName = getPersonName(fromId);
        const receiverName = getPersonName(toId);
        if (confirm(`Confirm that ${payerName} has paid ${formatMoney(amount)} directly to ${receiverName}?`)) {
            appData.events.push({
                id: generateId(),
                name: `${payerName} settled up with ${receiverName}`,
                cost: amount,
                category: '💸 Settlement',
                paidBy: fromId,
                splitAmong: [toId]
            });
            save();
        }
    };

    renderAll();
});
