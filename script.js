:root {
    /* Theme Variables - Easily customizable */
    --bg-color: #f4f4f9;
    --card-bg: #ffffff;
    --text-primary: #1a1a24;
    --text-secondary: #64748b;
    --primary-color: #0f172a;
    --primary-color-hover: #334155;
    --input-border: #cbd5e1;
    --input-focus: #3b82f6;
    --success-color: #10b981;
    --border-radius: 16px;
    --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    --spacing-md: 1.5rem;
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: var(--font-family);
    background-color: var(--bg-color);
    color: var(--text-primary);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    padding: var(--spacing-md);
    display: flex;
    justify-content: center;
    min-height: 100vh;
}

.container {
    width: 100%;
    max-width: 480px; /* Mobile-first constraint */
    display: flex;
    flex-direction: column;
    gap: 2rem;
}

header {
    text-align: center;
    margin-top: 1rem;
}

header h1 {
    font-size: 1.75rem;
    font-weight: 700;
    margin-bottom: 0.25rem;
}

header p {
    color: var(--text-secondary);
    font-size: 0.875rem;
}

.calculator-card {
    background-color: var(--card-bg);
    padding: 2rem;
    border-radius: var(--border-radius);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.input-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
}

.input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
}

.currency-symbol {
    position: absolute;
    left: 1rem;
    font-size: 1.125rem;
    color: var(--text-secondary);
    pointer-events: none;
}

input[type="number"] {
    width: 100%;
    padding: 1rem;
    font-size: 1.125rem;
    border: 1px solid var(--input-border);
    border-radius: 12px;
    background-color: var(--card-bg);
    color: var(--text-primary);
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    outline: none;
    -webkit-appearance: none;
    appearance: none;
}

/* Adjust padding for the input with currency symbol */
.input-wrapper input {
    padding-left: 2.25rem;
}

input[type="number"]:focus {
    border-color: var(--input-focus);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.results-section {
    text-align: center;
    padding: 1.5rem 0;
    border-top: 1px dashed var(--input-border);
    margin-top: 0.5rem;
}

.results-section h2 {
    font-size: 0.875rem;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
}

.amount {
    font-size: 2.5rem;
    font-weight: 800;
    color: var(--primary-color);
}

.primary-btn {
    width: 100%;
    padding: 1rem;
    font-size: 1rem;
    font-weight: 600;
    background-color: var(--primary-color);
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: background-color 0.2s ease, transform 0.1s ease;
    touch-action: manipulation;
}

.primary-btn:active {
    transform: scale(0.98);
}

.primary-btn:disabled {
    background-color: var(--input-border);
    cursor: not-allowed;
    transform: none;
}

.primary-btn.success {
    background-color: var(--success-color);
}

footer {
    text-align: center;
    padding-bottom: 2rem;
}

.support-section p {
    font-size: 0.875rem;
    color: var(--text-secondary);
    font-weight: 600;
    margin-bottom: 1rem;
}

.qr-code {
    width: 120px;
    height: 120px;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    background-color: white;
    padding: 0.5rem;
}
