// Check admin authentication
function checkAuth() {
    const isAuthenticated = sessionStorage.getItem('adminAuth');
    if (!isAuthenticated) {
        const password = prompt('Enter admin password:');
        if (password === 'admin123') { // Change this password in production
            sessionStorage.setItem('adminAuth', 'true');
        } else {
            alert('Invalid password');
            window.location.href = 'index.html';
        }
    }
}

function logout() {
    sessionStorage.removeItem('adminAuth');
    window.location.href = 'index.html';
}

// Load stats on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadStats();
});

// Load database statistics
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        
        document.getElementById('totalRecords').textContent = data.totalRecords || 0;
        document.getElementById('lastUpdated').textContent = data.lastUpdated || 'Never';
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// File upload handling
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');

uploadArea.addEventListener('click', () => {
    fileInput.click();
});

uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

function handleFileSelect(file) {
    const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
    ];
    
    if (!validTypes.includes(file.type)) {
        showMessage('error', 'Please select a valid Excel file (.xlsx or .xls)');
        return;
    }
    
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileDetails').textContent = `Size: ${formatFileSize(file.size)}`;
    fileInfo.classList.add('active');
    
    // Store file for upload
    window.selectedFile = file;
}

async function uploadFile() {
    if (!window.selectedFile) {
        showMessage('error', 'Please select a file first');
        return;
    }
    
    const formData = new FormData();
    formData.append('file', window.selectedFile);
    
    const loading = document.getElementById('uploadLoading');
    const messageDiv = document.getElementById('uploadMessage');
    
    loading.classList.add('active');
    messageDiv.style.display = 'none';
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        loading.classList.remove('active');
        
        if (data.success) {
            showMessage('success', `Successfully uploaded ${data.recordsProcessed} records`);
            fileInfo.classList.remove('active');
            window.selectedFile = null;
            loadStats();
        } else {
            showMessage('error', data.message || 'Upload failed');
        }
    } catch (error) {
        loading.classList.remove('active');
        showMessage('error', 'Error uploading file: ' + error.message);
    }
}

function showMessage(type, text) {
    const messageDiv = document.getElementById('uploadMessage');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = text;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

async function downloadTemplate() {
    try {
        const response = await fetch('/api/template');
        const blob = await response.blob();
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'license_template.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (error) {
        alert('Error downloading template: ' + error.message);
    }
}

async function clearDatabase() {
    if (!confirm('Are you sure you want to delete all records? This cannot be undone.')) {
        return;
    }
    
    if (!confirm('This will permanently delete all license data. Are you absolutely sure?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/clear', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            alert('Database cleared successfully');
            loadStats();
        } else {
            alert('Error clearing database: ' + data.message);
        }
    } catch (error) {
        alert('Error: ' + error.message);
    }
}
