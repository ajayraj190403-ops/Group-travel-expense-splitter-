document.addEventListener('DOMContentLoaded', () => {
    // Register PWA Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    const daysSlider = document.getElementById('days');
    const daysCountDisplay = document.getElementById('daysCount');
    const generateBtn = document.getElementById('generateBtn');
    const destinationInput = document.getElementById('destination');
    const loadingState = document.getElementById('loadingState');
    const itineraryResult = document.getElementById('itineraryResult');
    const dailyPlanList = document.getElementById('dailyPlanList');
    const resultTitle = document.getElementById('resultTitle');
    const lockPlanBtn = document.getElementById('lockPlanBtn');

    let generatedDays = [];

    daysSlider.addEventListener('input', (e) => {
        daysCountDisplay.textContent = e.target.value;
    });

    generateBtn.addEventListener('click', () => {
        const dest = destinationInput.value.trim();
        const days = parseInt(daysSlider.value);

        if (!dest) return alert("Please enter a destination!");

        itineraryResult.classList.add('hidden');
        loadingState.classList.remove('hidden');

        setTimeout(() => {
            buildItinerary(dest, days);
        }, 900);
    });

    const buildItinerary = (dest, days) => {
        dailyPlanList.innerHTML = '';
        generatedDays = [];
        resultTitle.textContent = `${days} Days in ${dest}`;

        const mornings = ["Arrival, Check-in & Local Heritage Walk", "Old City Tour & Iconic Landmarks", "Nature Trail & Scenic Viewpoints", "Local Bazaar & Cultural Museum"];
        const evenings = ["Sunset Waterfront Stroll & Dinner", "Street Food Trail & Night Market", "Rooftop Dining & Live Music", "Relaxed Cafe Hopping & Souvenirs"];

        for (let i = 1; i <= days; i++) {
            const mAct = mornings[(i - 1) % mornings.length];
            const eAct = evenings[(i - 1) % evenings.length];
            const summary = `Day ${i} (${dest}): ${mAct}`;
            generatedDays.push(summary);

            const div = document.createElement('div');
            div.className = 'timeline-item';
            div.innerHTML = `
                <div class="day-tag">Day ${i}</div>
                <strong>🌅 ${mAct}</strong>
                <div class="timeline-meta">🌙 Evening: ${eAct}</div>
            `;
            dailyPlanList.appendChild(div);
        }

        loadingState.classList.add('hidden');
        itineraryResult.classList.remove('hidden');
    };

    // UPGRADE 5: Push generated itinerary straight into settle.html's database
    lockPlanBtn.addEventListener('click', () => {
        const dest = destinationInput.value.trim();
        const days = parseInt(daysSlider.value);

        let appData = JSON.parse(localStorage.getItem('tripHubPro')) || {
            tripTitle: '',
            budget: 0,
            people: [],
            events: [],
            ideas: [],
            packingList: [
                { id: 'p1', name: 'Passports / IDs', done: false },
                { id: 'p2', name: 'Phone Chargers & Power Bank', done: false }
            ],
            settings: { currency: '₹', round: false, darkMode: false }
        };

        appData.tripTitle = `${days} Days in ${dest}`;

        // Append generated days into the Expense Timeline as ₹0 planned slots
        generatedDays.forEach((dayTitle, idx) => {
            appData.events.push({
                id: 'plan_' + Date.now() + '_' + idx,
                name: dayTitle,
                cost: 0,
                category: '🎟️ Activity',
                paidBy: null,
                splitAmong: []
            });
        });

        localStorage.setItem('tripHubPro', JSON.stringify(appData));
        window.location.href = 'settle.html';
    });
});
