/* jshint esversion: 6 */
document.addEventListener('DOMContentLoaded', function () {
    var appData = {};
    try {
        var saved = localStorage.getItem('tripHubPro');
        if (saved) {
            appData = JSON.parse(saved);
        }
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

    var editingEventId = null;

    var catColors = {
        'Food': '#fbbf24',
        'Transport': '#3b82f6',
        'Stay': '#8b5cf6',
        'Activity': '#ec4899',
        'Other': '#94a3b8',
        'Settlement': '#10b981'
    };

    var ui = {
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

    if (!ui.addEventBtn) return;

    function formatMoney(amount) {
        var num = Number(amount) || 0;
        var val = appData.settings.round ? Math.round(num) : num;
        var decimals = appData.settings.round ? 0 : 2;
        return appData.settings.currency + val.toFixed(decimals);
    }

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    function getPersonName(id) {
        for (var i = 0; i < appData.people.length; i++) {
            if (appData.people[i].id === id) {
                return appData.people[i].name;
            }
        }
        return 'Unknown';
    }

    function save() {
        localStorage.setItem('tripHubPro', JSON.stringify(appData));
        renderAll();
    }

    // Tab Switching
    var tabBtns = document.querySelectorAll('.tab-btn');
    for (var t = 0; t < tabBtns.length; t++) {
        tabBtns[t].addEventListener('click', function () {
            var allTabs = document.querySelectorAll('.tab-btn, .tab-content');
            for (var k = 0; k < allTabs.length; k++) {
                allTabs[k].classList.remove('active');
            }
            this.classList.add('active');
            var targetId = this.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    }

    function getPersonalStats() {
        var stats = {};
        appData.people.forEach(function (p) {
            stats[p.id] = { paid: 0, share: 0 };
        });

        appData.events.forEach(function (ev) {
            var isSettle = ev.category === 'Settlement' || ev.category === '💸 Settlement';
            if (ev.cost > 0 && !isSettle) {
                if (ev.paidBy && stats[ev.paidBy]) {
                    stats[ev.paidBy].paid += ev.cost;
                }
                if (ev.splitAmong && ev.splitAmong.length > 0) {
                    var splitVal = ev.cost / ev.splitAmong.length;
                    ev.splitAmong.forEach(function (memberId) {
                        if (stats[memberId]) stats[memberId].share += splitVal;
                    });
                }
            }
        });
        return stats;
    }

    function getSettlements() {
        var debts = {};
        appData.people.forEach(function (p1) {
            debts[p1.id] = {};
            appData.people.forEach(function (p2) {
                debts[p1.id][p2.id] = 0;
            });
        });

        appData.events.forEach(function (ev) {
            if (ev.cost > 0 && ev.paidBy && ev.splitAmong && ev.splitAmong.length > 0) {
                var splitAmount = ev.cost / ev.splitAmong.length;
                ev.splitAmong.forEach(function (borrowerId) {
                    if (borrowerId !== ev.paidBy && debts[borrowerId] && debts[borrowerId][ev.paidBy] !== undefined) {
                        debts[borrowerId][ev.paidBy] += splitAmount;
                    }
                });
            }
        });

        var transactions = [];
        var processedPairs = {};

        appData.people.forEach(function (p1) {
            appData.people.forEach(function (p2) {
                if (p1.id === p2.id) return;
                var pairKey = [p1.id, p2.id].sort().join('-');
                if (processedPairs[pairKey]) return;
                processedPairs[pairKey] = true;

                var p1OwesP2 = debts[p1.id][p2.id];
                var p2OwesP1 = debts[p2.id][p1.id];

                if (p1OwesP2 > p2OwesP1) {
                    var diff1 = p1OwesP2 - p2OwesP1;
                    if (diff1 > 0.01) {
                        transactions.push({ fromId: p1.id, fromName: p1.name, toId: p2.id, toName: p2.name, amount: diff1 });
                    }
                } else if (p2OwesP1 > p1OwesP2) {
                    var diff2 = p2OwesP1 - p1OwesP2;
                    if (diff2 > 0.01) {
                        transactions.push({ fromId: p2.id, fromName: p2.name, toId: p1.id, toName: p1.name, amount: diff2 });
                    }
                }
            });
        });

        return transactions;
    }

    function renderSettings() {
        ui.currencySelect.value = appData.settings.currency;
        ui.roundToggle.checked = appData.settings.round;
        for (var i = 0; i < ui.currencyDisplays.length; i++) {
            ui.currencyDisplays[i].textContent = appData.settings.currency;
        }
        ui.darkModeToggle.checked = appData.settings.darkMode;
        if (appData.settings.darkMode) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }

    function renderPeople() {
        var list = document.getElementById('peopleList');
        var stats = getPersonalStats();
        list.innerHTML = '';

        appData.people.forEach(function (p) {
            var pStat = stats[p.id] || { paid: 0, share: 0 };
            list.innerHTML +=
                '<div class="list-item">' +
                    '<div>' +
                        '<strong>' + p.name + '</strong>' +
                        '<div class="person-meta">Paid Upfront: <strong>' + formatMoney(pStat.paid) + '</strong> | True Share: <strong>' + formatMoney(pStat.share) + '</strong></div>' +
                    '</div>' +
                    '<button type="button" class="remove-btn" onclick="removePerson(\'' + p.id + '\')">&#10005;</button>' +
                '</div>';
        });
    }

    function renderBudget() {
        var totalSpent = 0;
        appData.events.forEach(function (ev) {
            var isSettle = ev.category === 'Settlement' || ev.category === '💸 Settlement';
            if (!isSettle) {
                totalSpent += (Number(ev.cost) || 0);
            }
        });

        var spentText = document.getElementById('budgetSpentText');
        var limitText = document.getElementById('budgetLimitText');
        var barFill = document.getElementById('budgetBarFill');

        spentText.textContent = 'Total Spent: ' + formatMoney(totalSpent);

        if (appData.budget > 0) {
            var pct = Math.min((totalSpent / appData.budget) * 100, 100);
            var rawPct = Math.round((totalSpent / appData.budget) * 100);
            limitText.textContent = 'Cap: ' + formatMoney(appData.budget) + ' (' + rawPct + '%)';
            barFill.style.width = pct + '%';

            if (rawPct >= 100) barFill.style.backgroundColor = 'var(--danger-color)';
            else if (rawPct >= 75) barFill.style.backgroundColor = 'var(--warning-color)';
            else barFill.style.backgroundColor = 'var(--success-color)';
        } else {
            limitText.textContent = 'Cap: Not Set';
            barFill.style.width = '0%';
        }
    }

    function renderPackingList() {
        var container = document.getElementById('packingList');
        container.innerHTML = '';
        appData.packingList.forEach(function (item) {
            container.innerHTML +=
                '<div class="packing-item ' + (item.done ? 'done' : '') + '">' +
                    '<div style="display:flex; align-items:center;">' +
                        '<input type="checkbox" style="width: 1.15rem; height: 1.15rem; margin-right: 0.65rem;" ' + (item.done ? 'checked' : '') + ' onchange="togglePacking(\'' + item.id + '\', this.checked)">' +
                        '<span class="item-name">' + item.name + '</span>' +
                    '</div>' +
                    '<button type="button" class="remove-btn" onclick="removePacking(\'' + item.id + '\')">&#10005;</button>' +
                '</div>';
        });
    }

    function renderEventForm() {
        var paidBySelect = document.getElementById('paidBySelect');
        var splitCheckboxes = document.getElementById('splitCheckboxes');
        if (appData.people.length > 0) {
            document.getElementById('paidByGroup').style.display = 'flex';
            document.getElementById('splitAmongGroup').style.display = 'flex';
            paidBySelect.innerHTML = appData.people.map(function (p) {
                return '<option value="' + p.id + '">' + p.name + '</option>';
            }).join('');
            splitCheckboxes.innerHTML = appData.people.map(function (p) {
                return '<div><input type="checkbox" id="chk_' + p.id + '" value="' + p.id + '" checked><label for="chk_' + p.id + '">' + p.name + '</label></div>';
            }).join('');
        } else {
            document.getElementById('paidByGroup').style.display = 'none';
            document.getElementById('splitAmongGroup').style.display = 'none';
        }
    }

    function renderTimeline() {
        var container = document.getElementById('timelineList');
        container.innerHTML = '';

        if (appData.events.length === 0) {
            container.innerHTML = '<p class="empty-state">No timeline events or expenses yet.</p>';
            return;
        }

        appData.events.forEach(function (ev) {
            var isSettlement = ev.category === 'Settlement' || ev.category === '💸 Settlement';
            var metaText = '<span>Planned slot (0 logged)</span> <button type="button" class="mini-btn no-print" onclick="loadPlannedEvent(\'' + ev.id + '\')">+ Log Cost</button>';

            if (isSettlement) {
                var payerName = getPersonName(ev.paidBy);
                var receiverName = getPersonName(ev.splitAmong && ev.splitAmong[0]);
                metaText = '<span>Direct Settlement: <strong>' + payerName + '</strong> paid <strong>' + receiverName + '</strong></span>';
            } else if (ev.cost > 0) {
                var splitNames = (ev.splitAmong || []).map(function (id) { return getPersonName(id); }).join(', ');
                metaText = '<span>Paid by: <strong>' + getPersonName(ev.paidBy) + '</strong> | Split with: ' + splitNames + '</span>';
            }

            container.innerHTML +=
                '<div class="timeline-item ' + (isSettlement ? 'settlement-item' : '') + '">' +
                    '<button type="button" class="remove-btn" style="position:absolute; top:0.4rem; right:0.4rem;" onclick="removeEvent(\'' + ev.id + '\')">&#10005;</button>' +
                    '<strong>' + ev.name + '</strong> - <span style="color:var(--success-color); font-weight:700;">' + formatMoney(ev.cost) + '</span> <span style="font-size:0.75rem">[' + ev.category + ']</span>' +
                    '<div class="timeline-meta">' + metaText + '</div>' +
                '</div>';
        });
    }

    function renderSettlements() {
        var container = document.getElementById('settlementsList');
        var transactions = getSettlements();

        if (appData.people.length === 0) {
            container.innerHTML = '<p class="empty-state">Add travelers above to begin.</p>';
            ui.copyBtn.disabled = true;
            return;
        }

        if (transactions.length === 0) {
            container.innerHTML = '<p class="empty-state">Everyone is 100% settled up!</p>';
            ui.copyBtn.disabled = true;
        } else {
            container.innerHTML = transactions.map(function (t) {
                return '<div class="settlement-card">' +
                    '<div>' +
                        '<strong>' + t.fromName + '</strong> owes <strong>' + t.toName + '</strong>' +
                        '<div style="font-size:1rem; color:var(--success-color); font-weight:800;">' + formatMoney(t.amount) + '</div>' +
                    '</div>' +
                    '<button type="button" class="mini-btn" onclick="markAsPaid(\'' + t.fromId + '\', \'' + t.toId + '\', ' + t.amount + ')">' +
                        'Settle: ' + t.fromName + ' -> ' + t.toName +
                    '</button>' +
                '</div>';
            }).join('');
            ui.copyBtn.disabled = false;
        }
    }

    function renderIdeas() {
        var container = document.getElementById('ideasList');
        container.innerHTML = '';
        var sorted = appData.ideas.slice().sort(function (a, b) { return b.score - a.score; });
        sorted.forEach(function (idea) {
            container.innerHTML +=
                '<div class="idea-card">' +
                    '<span>' + idea.name + '</span>' +
                    '<div class="vote-controls">' +
                        '<button type="button" class="vote-btn" onclick="voteIdea(\'' + idea.id + '\', 1)">+</button>' +
                        '<span class="vote-score">' + idea.score + '</span>' +
                        '<button type="button" class="vote-btn" onclick="voteIdea(\'' + idea.id + '\', -1)">-</button>' +
                        '<button type="button" class="remove-btn" onclick="removeIdea(\'' + idea.id + '\')">&#10005;</button>' +
                    '</div>' +
                '</div>';
        });
    }

    function renderAnalytics() {
        var catTotals = {};
        var grandTotal = 0;
        appData.events.forEach(function (ev) {
            var isSettle = ev.category === 'Settlement' || ev.category === '💸 Settlement';
            if (ev.cost > 0 && !isSettle) {
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

        var gradientString = [];
        var currentDeg = 0;
        for (var cat in catTotals) {
            if (Object.prototype.hasOwnProperty.call(catTotals, cat)) {
                var total = catTotals[cat];
                var pct = (total / grandTotal) * 100;
                var color = catColors[cat] || '#94a3b8';
                gradientString.push(color + ' ' + currentDeg + '% ' + (currentDeg + pct) + '%');
                currentDeg += pct;
                ui.categoryLegend.innerHTML +=
                    '<div class="legend-item"><div class="legend-color" style="background:' + color + '"></div>' + cat + ': ' + formatMoney(total) + ' (' + Math.round(pct) + '%)</div>';
            }
        }
        ui.pieChart.style.background = 'conic-gradient(' + gradientString.join(', ') + ')';
    }

    function renderAll() {
        ui.activeTripBanner.textContent = 'Active Trip: ' + appData.tripTitle;
        renderSettings();
        renderPeople();
        renderEventForm();
        renderBudget();
        renderTimeline();
        renderSettlements();
        renderIdeas();
        renderAnalytics();
        renderPackingList();
    }

    // Event Listeners
    document.getElementById('setBudgetBtn').addEventListener('click', function () {
        var val = parseFloat(document.getElementById('budgetInput').value);
        if (!isNaN(val) && val >= 0) {
            appData.budget = val;
            document.getElementById('budgetInput').value = '';
            save();
        }
    });

    document.getElementById('exportPdfBtn').addEventListener('click', function () {
        window.print();
    });

    document.getElementById('rouletteBtn').addEventListener('click', function () {
        if (appData.people.length === 0) return alert('Add travelers first!');
        var resultDiv = document.getElementById('rouletteResult');
        var rouletteBtn = document.getElementById('rouletteBtn');
        var counter = 0;
        rouletteBtn.disabled = true;
        var interval = setInterval(function () {
            var randomPerson = appData.people[Math.floor(Math.random() * appData.people.length)];
            resultDiv.textContent = randomPerson.name;
            counter++;
            if (counter > 18) {
                clearInterval(interval);
                resultDiv.innerHTML = '<strong>' + resultDiv.textContent + '</strong> pays next!';
                rouletteBtn.disabled = false;
            }
        }, 65);
    });

    document.getElementById('addPackingBtn').addEventListener('click', function () {
        var input = document.getElementById('newPackingInput');
        if (input.value.trim()) {
            appData.packingList.push({ id: generateId(), name: input.value.trim(), done: false });
            input.value = '';
            save();
        }
    });

    document.getElementById('addPersonBtn').addEventListener('click', function () {
        var input = document.getElementById('newPersonName');
        if (input.value.trim()) {
            appData.people.push({ id: generateId(), name: input.value.trim() });
            input.value = '';
            save();
        }
    });

    document.getElementById('parsePlanBtn').addEventListener('click', function () {
        var text = document.getElementById('pastePlanInput').value;
        text.split('\n').forEach(function (line) {
            if (line.trim() !== '') {
                appData.events.push({ id: generateId(), name: line.trim(), cost: 0, category: 'Other', paidBy: null, splitAmong: [] });
            }
        });
        document.getElementById('pastePlanInput').value = '';
        save();
    });

    ui.addEventBtn.addEventListener('click', function () {
        var name = document.getElementById('eventName').value.trim();
        var cost = parseFloat(document.getElementById('eventCost').value) || 0;
        var category = document.getElementById('eventCategory').value;

        if (!name) return alert('Please enter an event or expense name.');
        if (cost > 0 && appData.people.length === 0) {
            return alert('Please add travelers in the Settle tab before logging a paid expense!');
        }

        var paidBy = appData.people.length > 0 ? document.getElementById('paidBySelect').value : null;
        var checkedBoxes = document.querySelectorAll('#splitCheckboxes input:checked');
        var splitAmong = [];
        for (var i = 0; i < checkedBoxes.length; i++) {
            splitAmong.push(checkedBoxes[i].value);
        }

        if (cost > 0 && splitAmong.length === 0) {
            return alert('Select at least one person to split this cost with.');
        }

        if (editingEventId) {
            for (var j = 0; j < appData.events.length; j++) {
                if (appData.events[j].id === editingEventId) {
                    appData.events[j].name = name;
                    appData.events[j].cost = cost;
                    appData.events[j].category = category;
                    appData.events[j].paidBy = paidBy;
                    appData.events[j].splitAmong = splitAmong;
                    break;
                }
            }
            editingEventId = null;
            ui.addEventBtn.textContent = 'Save to Timeline';
        } else {
            appData.events.push({ id: generateId(), name: name, cost: cost, category: category, paidBy: paidBy, splitAmong: splitAmong });
        }

        document.getElementById('eventName').value = '';
        document.getElementById('eventCost').value = '';
        save();
    });

    document.getElementById('addIdeaBtn').addEventListener('click', function () {
        var input = document.getElementById('newIdeaInput');
        if (input.value.trim()) {
            appData.ideas.push({ id: generateId(), name: input.value.trim(), score: 0 });
            input.value = '';
            save();
        }
    });

    ui.currencySelect.addEventListener('change', function (e) { appData.settings.currency = e.target.value; save(); });
    ui.roundToggle.addEventListener('change', function (e) { appData.settings.round = e.target.checked; save(); });
    ui.darkModeToggle.addEventListener('change', function (e) { appData.settings.darkMode = e.target.checked; save(); });

    document.getElementById('exportSyncBtn').addEventListener('click', function () {
        var syncString = btoa(encodeURIComponent(JSON.stringify(appData)));
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(syncString).then(function () {
                var btn = document.getElementById('exportSyncBtn');
                btn.textContent = 'Copied Sync Code!';
                setTimeout(function () { btn.textContent = 'Copy Sync Code'; }, 2500);
            }).catch(function () {
                prompt('Copy your sync code:', syncString);
            });
        } else {
            prompt('Copy your sync code:', syncString);
        }
    });

    document.getElementById('importSyncBtn').addEventListener('click', function () {
        var input = document.getElementById('importSyncInput').value.trim();
        try {
            var importedData = JSON.parse(decodeURIComponent(atob(input)));
            if (importedData.people && importedData.events) {
                appData = importedData;
                save();
                document.getElementById('importSyncInput').value = '';
                alert('Trip synced successfully!');
            } else {
                alert('Invalid Sync Code!');
            }
        } catch (e) {
            alert('Invalid Sync Code!');
        }
    });

    ui.copyBtn.addEventListener('click', function () {
        var text = '*' + appData.tripTitle + ' - Settlement*\n\n';
        getSettlements().forEach(function (t) {
            text += '* ' + t.fromName + ' owes ' + t.toName + ': ' + formatMoney(t.amount) + '\n';
        });
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                ui.copyBtn.textContent = 'Copied!';
                setTimeout(function () { ui.copyBtn.textContent = 'Copy Settlement to WhatsApp'; }, 2500);
            });
        }
    });

    // Global Action Helpers
    window.removePerson = function (id) {
        appData.people = appData.people.filter(function (p) { return p.id !== id; });
        appData.events = appData.events.filter(function (e) { return e.paidBy !== id && (e.splitAmong || []).indexOf(id) === -1; });
        save();
    };
    window.removeEvent = function (id) {
        appData.events = appData.events.filter(function (e) { return e.id !== id; });
        save();
    };
    window.removeIdea = function (id) {
        appData.ideas = appData.ideas.filter(function (i) { return i.id !== id; });
        save();
    };
    window.voteIdea = function (id, val) {
        for (var i = 0; i < appData.ideas.length; i++) {
            if (appData.ideas[i].id === id) {
                appData.ideas[i].score += val;
                break;
            }
        }
        save();
    };
    window.togglePacking = function (id, isDone) {
        for (var i = 0; i < appData.packingList.length; i++) {
            if (appData.packingList[i].id === id) {
                appData.packingList[i].done = isDone;
                break;
            }
        }
        save();
    };
    window.removePacking = function (id) {
        appData.packingList = appData.packingList.filter(function (i) { return i.id !== id; });
        save();
    };
    window.loadPlannedEvent = function (id) {
        for (var i = 0; i < appData.events.length; i++) {
            if (appData.events[i].id === id) {
                editingEventId = id;
                document.getElementById('eventName').value = appData.events[i].name;
                document.getElementById('eventCategory').value = 'Activity';
                ui.addEventBtn.textContent = 'Update Planned Item Cost';
                document.getElementById('expenseFormSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
                document.getElementById('eventCost').focus();
                break;
            }
        }
    };
    window.markAsPaid = function (fromId, toId, amount) {
        var payerName = getPersonName(fromId);
        var receiverName = getPersonName(toId);
        if (confirm('Confirm that ' + payerName + ' has paid ' + formatMoney(amount) + ' directly to ' + receiverName + '?')) {
            appData.events.push({
                id: generateId(),
                name: payerName + ' settled up with ' + receiverName,
                cost: amount,
                category: 'Settlement',
                paidBy: fromId,
                splitAmong: [toId]
            });
            save();
        }
    };

    renderAll();
});
