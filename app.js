// Tab switching functionality
const tabs = document.querySelectorAll('.tab');
const forms = document.querySelectorAll('.search-form');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        // Update active tab
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show corresponding form
        forms.forEach(form => {
            if (form.id === `${tabName}Form`) {
                form.classList.add('active');
            } else {
                form.classList.remove('active');
            }
        });
        
        // Clear results
        document.getElementById('result').style.display = 'none';
    });
});

// Search by Applicant ID
document.getElementById('applicantForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const applicantId = document.getElementById('applicantId').value.trim();
    await searchLicense('applicantId', applicantId);
});

// Search by License Number
document.getElementById('licenseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const licenseNumber = document.getElementById('licenseNumber').value.trim();
    await searchLicense('licenseNumber', licenseNumber);
});

// Generic search function
async function searchLicense(searchType, searchValue) {
    const loading = document.querySelector('.loading');
    const resultDiv = document.getElementById('result');
    const submitBtn = document.querySelector('.search-form.active button[type="submit"]');
    
    // Show loading
    loading.classList.add('active');
    resultDiv.style.display = 'none';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                searchType: searchType,
                searchValue: searchValue
            })
        });
        
        const data = await response.json();
        
        // Hide loading
        loading.classList.remove('active');
        submitBtn.disabled = false;
        
        if (data.success && data.data) {
            displaySuccess(data.data);
        } else {
            displayError(data.message || 'No record found');
        }
    } catch (error) {
        loading.classList.remove('active');
        submitBtn.disabled = false;
        displayError('Error connecting to server. Please try again.');
    }
}

// Display success result
function displaySuccess(data) {
    const resultDiv = document.getElementById('result');
    resultDiv.className = 'result success';
    
    let html = `
        <div class="result-title">✓ License Record Found</div>
        <div class="result-data">
    `;
    
    // Display all fields from the data
    for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined && value !== '') {
            const label = formatLabel(key);
            html += `
                <div class="data-row">
                    <div class="data-label">${label}:</div>
                    <div class="data-value">${escapeHtml(value)}</div>
                </div>
            `;
        }
    }
    
    html += `</div>`;
    resultDiv.innerHTML = html;
    resultDiv.style.display = 'block';
}

// Display error result
function displayError(message) {
    const resultDiv = document.getElementById('result');
    resultDiv.className = 'result error';
    resultDiv.innerHTML = `
        <div class="result-title">✗ Not Found</div>
        <p style="color: #991b1b; margin-top: 8px;">${escapeHtml(message)}</p>
    `;
    resultDiv.style.display = 'block';
}

// Format field labels
function formatLabel(key) {
    // Convert camelCase or snake_case to Title Case
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^./, str => str.toUpperCase())
        .trim();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Auto-format license number input
const licenseInput = document.getElementById('licenseNumber');
licenseInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/[^0-9]/g, '');
    
    if (value.length > 2) {
        value = value.slice(0, 2) + '-' + value.slice(2);
    }
    if (value.length > 5) {
        value = value.slice(0, 5) + '-' + value.slice(5);
    }
    if (value.length > 14) {
        value = value.slice(0, 14);
    }
    
    e.target.value = value;
});
