document.addEventListener('DOMContentLoaded', () => {
    const totalCostInput = document.getElementById('totalCost');
    const travelersInput = document.getElementById('travelers');
    const perPersonAmountDisplay = document.getElementById('perPersonAmount');
    const copyBtn = document.getElementById('copyBtn');

    let totalCost = 0;
    let travelers = 0;
    let perPerson = 0;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount);
    };

    const calculateSplit = () => {
        // Use Math.abs to ensure positive numbers and handle empty strings cleanly
        totalCost = Math.abs(parseFloat(totalCostInput.value)) || 0;
        travelers = Math.abs(parseInt(travelersInput.value)) || 0;

        if (totalCost > 0 && travelers > 0) {
            perPerson = totalCost / travelers;
            perPersonAmountDisplay.textContent = formatCurrency(perPerson);
            copyBtn.disabled = false;
        } else {
            perPersonAmountDisplay.textContent = '₹0.00';
            copyBtn.disabled = true;
        }
    };

    // Listen to multiple event types to ensure mobile keyboards trigger the function
    const events = ['input', 'keyup', 'change'];
    events.forEach(evt => {
        totalCostInput.addEventListener(evt, calculateSplit);
        travelersInput.addEventListener(evt, calculateSplit);
    });

    copyBtn.addEventListener('click', async () => {
        if (copyBtn.disabled) return;

        const breakdownText = `*Trip Expense Breakdown* ✈️\n\n*Total Cost:* ${formatCurrency(totalCost)}\n*Number of Travelers:* ${travelers}\n\n👉 *Cost per person:* ${formatCurrency(perPerson)}\n\nPlease pay your share soon! 💸`;

        try {
            await navigator.clipboard.writeText(breakdownText);
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied! Ready to paste.';
            copyBtn.classList.add('success');
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.classList.remove('success');
            }, 2500);
        } catch (err) {
            alert('Failed to copy to clipboard.');
        }
    });
});
