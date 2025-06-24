document.addEventListener('DOMContentLoaded', () => {

    // --- THEME SWITCHER LOGIC ---
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;

    // Function to apply the theme
    const applyTheme = (theme) => {
        body.dataset.theme = theme;
        themeToggle.checked = theme === 'dark';
    };

    // Function to handle toggle change
    themeToggle.addEventListener('change', () => {
        const newTheme = themeToggle.checked ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });

    // Check for saved theme in localStorage or user's system preference
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // Set initial theme on page load
    if (savedTheme) {
        applyTheme(savedTheme);
    } else {
        applyTheme(prefersDark ? 'dark' : 'light');
    }


    // --- CORE APP LOGIC ---
    const coffeeForm = document.getElementById('coffee-form');
    const submitButton = document.getElementById('submit-button');
    const resultContainer = document.getElementById('result-container');

    const setLoadingState = (isLoading) => {
        submitButton.disabled = isLoading;
        if (isLoading) {
            submitButton.textContent = 'Analyzing...';
            // By injecting the spinner inside a div with the 'placeholder' class,
            // we maintain the container's height and centering, preventing layout shift.
            resultContainer.innerHTML = `
                <div class="placeholder">
                    <svg class="spinner" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p>Our AI Barista is crafting your recipe...</p>
                </div>
            `;
        }
        // The "false" state is handled by the displayRecommendation function replacing the content
        // and the 'finally' block resetting the button.
    };

    const displayRecommendation = (result) => {
        resultContainer.innerHTML = '';

        if (result.error) {
            resultContainer.innerHTML = `<div class="error-message">${result.error}</div>`;
            return;
        }

        const card = document.createElement('div');
        card.className = 'analysis-card animate-fade-in';

        const confidenceClass = result.confidence?.toLowerCase() || 'medium';
        const tasteGuide = {
            sour: "Your coffee is likely under-extracted. The water isn't pulling enough flavor out. Grind finer to increase surface area and extraction.",
            bitter: "Your coffee is likely over-extracted. The water is pulling too much flavor, including bitter compounds. Grind coarser to reduce surface area and extraction.",
        };
        
        card.innerHTML = `
            <h2>Your Recommendation</h2>
            <div class="confidence-badge ${confidenceClass}">
                ${result.confidence || 'Medium'} Confidence
            </div>
            <p class="summary">${result.summary || 'No summary provided.'}</p>
            
            <div class="setting-display">
                <p class="label">Recommended Starting Point</p>
                <p class="setting">${result.recommendedSetting || 'N/A'}</p>
                <p class="unit">(${result.unit || 'Not specified'})</p>
            </div>
            
            <div class="space-y-6">
                 <div>
                    <h3 class="section-title">How to Adjust From Here</h3>
                    <div class="taste-guide">
                        <p><strong>If it tastes SOUR or weak:</strong> ${tasteGuide.sour}</p>
                        <p><strong>If it tastes BITTER or harsh:</strong> ${tasteGuide.bitter}</p>
                    </div>
                </div>
            </div>
        `;
        
        resultContainer.appendChild(card);
    };

    coffeeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = new FormData(coffeeForm);
        const grinder = formData.get('grinder').trim();
        const beans = formData.get('beans').trim();
        const machine = formData.get('machine').trim();
        
        if (!grinder || !beans || !machine) {
            resultContainer.innerHTML = `<div class="error-message">Please fill out all three fields to get a recommendation.</div>`;
            return;
        }
        
        setLoadingState(true);
        const data = { grinder, beans, machine };

        try {
            const response = await fetch('/api/recommendation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await response.json();
            displayRecommendation(result);
        } catch (error) {
            console.error('Error:', error);
            displayRecommendation({ error: 'An unexpected error occurred. Please check the console and try again.' });
        } finally {
            // Reset the button state regardless of success or failure
            submitButton.disabled = false;
            submitButton.textContent = 'Brew Recommendation';
        }
    });
});
