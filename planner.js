document.addEventListener('DOMContentLoaded', () => {
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

    // Update slider number dynamically across mobile browsers
    ['input', 'change'].forEach(evt => {
        daysSlider.addEventListener(evt, (e) => {
            daysCountDisplay.textContent = e.target.value;
        });
    });

    generateBtn.addEventListener('click', () => {
        const dest = destinationInput.value.trim();
        const days = parseInt(daysSlider.value) || 5;

        if (!dest) {
            alert("Please enter a destination (e.g., Mumbai, Goa, Jaipur)!");
            return;
        }

        itineraryResult.classList.add('hidden');
        loadingState.classList.remove('hidden');

        setTimeout(() => {
            buildItinerary(dest, days);
        }, 600);
    });

    const buildItinerary = (dest, days) => {
        dailyPlanList.innerHTML = '';
        generatedDays = [];
        resultTitle.textContent = `${days} Days in ${dest}`;

        const morningPlans = [
            `Arrival in ${dest}, Hotel Check-in & Local Walk`,
            `${dest} Iconic Landmarks & Heritage Sightseeing`,
            `Guided Cultural Tour & Famous Local Cafes`,
            `Scenic Viewpoints & Morning Nature Trail`,
            `Famous Temples / Monuments & Old City Exploration`
        ];

        const afternoonPlans = [
            `Popular Local Market & Street Food Tasting`,
            `Waterfront / Promenade Stroll & Sunset Views`,
            `Adventure Activities & Group Photo Spots`,
            `Shopping for Local Crafts & Souvenirs`,
            `Relaxed Lounge & Signature ${dest} Dinner`
        ];

        for (let i = 1; i <= days; i++) {
            const mAct = morningPlans[(i - 1) % morningPlans.length];
            const eAct = afternoonPlans[(i - 1) % afternoonPlans.length];
            const summary = `Day ${i} (${dest}): ${mAct}`;
            generatedDays.push(summary);

            const div = document.createElement('div');
            div.className = 'timeline-item';
            div.innerHTML = `
                <div class="day-tag">Day ${i}</div>
                <strong>🌅 ${mAct}</strong>
                <div class="timeline-meta">🌙 Afternoon/Evening: ${eAct}</div>
            `;
            dailyPlanList.appendChild(div);
        }

        loadingState.classList.add('hidden');
        itineraryResult.classList.remove('hidden');
        itineraryResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Push generated itinerary straight into settle.html's database
    lockPlanBtn.addEventListener('click', () => {
        const dest = destinationInput.value.trim() || 'Trip';
        const days = parseInt(daysSlider.value) || 5;

        let appData = {};
        try {
            appData = JSON.parse(localStorage.getItem('tripHubPro')) || {};
        } catch (e) {
            appData = {};
        }

        appData.tripTitle = `${days} Days in ${dest}`;
        if (appData.budget === undefined) appData.budget = 0;
        if (!Array.isArray(appData.people)) appData.people = [];
        if (!Array.isArray(appData.events)) appData.events = [];
        if (!Array.isArray(appData.ideas)) appData.ideas = [];
        if (!Array.isArray(appData.packingList)) {
            appData.packingList = [
                { id: 'p1', name: 'Passports / IDs', done: false },
                { id: 'p2', name: 'Phone Chargers & Power Bank', done: false }
            ];
        }
        if (!appData.settings) {
            appData.settings = { currency: '₹', round: false, darkMode: false };
        }

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
