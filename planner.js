/* jshint esversion: 6 */
document.addEventListener('DOMContentLoaded', function () {
    var daysSlider = document.getElementById('days');
    var daysCountDisplay = document.getElementById('daysCount');
    var generateBtn = document.getElementById('generateBtn');
    var destinationInput = document.getElementById('destination');
    var loadingState = document.getElementById('loadingState');
    var itineraryResult = document.getElementById('itineraryResult');
    var dailyPlanList = document.getElementById('dailyPlanList');
    var resultTitle = document.getElementById('resultTitle');
    var lockPlanBtn = document.getElementById('lockPlanBtn');

    // Safety guard if script is loaded on a page without planner elements
    if (!daysSlider || !generateBtn) {
        return;
    }

    var generatedDays = [];

    function updateDaysCount() {
        daysCountDisplay.textContent = daysSlider.value;
    }

    daysSlider.addEventListener('input', updateDaysCount);
    daysSlider.addEventListener('change', updateDaysCount);

    function buildItinerary(dest, days) {
        dailyPlanList.innerHTML = '';
        generatedDays = [];
        resultTitle.textContent = days + ' Days in ' + dest;

        var morningPlans = [
            'Arrival in ' + dest + ', Hotel Check-in & Local Walk',
            dest + ' Iconic Landmarks & Heritage Sightseeing',
            'Guided Cultural Tour & Famous Local Cafes',
            'Scenic Viewpoints & Morning Nature Trail',
            'Famous Temples / Monuments & Old City Exploration'
        ];

        var afternoonPlans = [
            'Popular Local Market & Street Food Tasting',
            'Waterfront / Promenade Stroll & Sunset Views',
            'Adventure Activities & Group Photo Spots',
            'Shopping for Local Crafts & Souvenirs',
            'Relaxed Lounge & Signature ' + dest + ' Dinner'
        ];

        for (var i = 1; i <= days; i++) {
            var mAct = morningPlans[(i - 1) % morningPlans.length];
            var eAct = afternoonPlans[(i - 1) % afternoonPlans.length];
            var summary = 'Day ' + i + ' (' + dest + '): ' + mAct;
            generatedDays.push(summary);

            var div = document.createElement('div');
            div.className = 'timeline-item';
            div.innerHTML =
                '<div class="day-tag">Day ' + i + '</div>' +
                '<strong>Morning: ' + mAct + '</strong>' +
                '<div class="timeline-meta">Evening: ' + eAct + '</div>';
            dailyPlanList.appendChild(div);
        }

        loadingState.classList.add('hidden');
        itineraryResult.classList.remove('hidden');
        itineraryResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    generateBtn.addEventListener('click', function () {
        var dest = destinationInput.value.trim();
        var days = parseInt(daysSlider.value, 10) || 5;

        if (!dest) {
            alert('Please enter a destination (e.g., Mumbai, Goa, Jaipur)!');
            return;
        }

        itineraryResult.classList.add('hidden');
        loadingState.classList.remove('hidden');

        setTimeout(function () {
            buildItinerary(dest, days);
        }, 600);
    });

    lockPlanBtn.addEventListener('click', function () {
        var dest = destinationInput.value.trim() || 'Trip';
        var days = parseInt(daysSlider.value, 10) || 5;

        var appData = {};
        try {
            var saved = localStorage.getItem('tripHubPro');
            if (saved) {
                appData = JSON.parse(saved);
            }
        } catch (e) {
            appData = {};
        }

        appData.tripTitle = days + ' Days in ' + dest;
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

        for (var idx = 0; idx < generatedDays.length; idx++) {
            appData.events.push({
                id: 'plan_' + Date.now() + '_' + idx,
                name: generatedDays[idx],
                cost: 0,
                category: 'Activity',
                paidBy: null,
                splitAmong: []
            });
        }

        localStorage.setItem('tripHubPro', JSON.stringify(appData));
        window.location.href = 'settle.html';
    });
});
