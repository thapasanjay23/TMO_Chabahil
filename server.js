const express = require('express');
const multer = require('multer');
const xlsx = require('xlsx');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Configure multer for file uploads
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB max
    }
});

// Initialize SQLite database with optimizations
const db = new sqlite3.Database('./licenses.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables with indexes for fast searching
function initializeDatabase() {
    db.serialize(() => {
        // Create licenses table
        db.run(`
            CREATE TABLE IF NOT EXISTS licenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                license_number TEXT UNIQUE,
                applicant_id TEXT,
                name TEXT,
                address TEXT,
                date_of_birth TEXT,
                license_type TEXT,
                issue_date TEXT,
                expiry_date TEXT,
                status TEXT,
                additional_data TEXT
            )
        `);

        // Create indexes for fast searching
        db.run('CREATE INDEX IF NOT EXISTS idx_license_number ON licenses(license_number)');
        db.run('CREATE INDEX IF NOT EXISTS idx_applicant_id ON licenses(applicant_id)');

        // Create metadata table
        db.run(`
            CREATE TABLE IF NOT EXISTS metadata (
                key TEXT PRIMARY KEY,
                value TEXT
            )
        `);

        console.log('Database initialized successfully');
    });
}

// API: Search for license
app.post('/api/search', (req, res) => {
    const { searchType, searchValue } = req.body;

    if (!searchType || !searchValue) {
        return res.json({
            success: false,
            message: 'Missing search parameters'
        });
    }

    let query;
    let param;

    if (searchType === 'licenseNumber') {
        query = 'SELECT * FROM licenses WHERE license_number = ? LIMIT 1';
        param = searchValue.toUpperCase();
    } else if (searchType === 'applicantId') {
        query = 'SELECT * FROM licenses WHERE applicant_id = ? LIMIT 1';
        param = searchValue;
    } else {
        return res.json({
            success: false,
            message: 'Invalid search type'
        });
    }

    db.get(query, [param], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.json({
                success: false,
                message: 'Database error occurred'
            });
        }

        if (row) {
            // Remove internal fields
            const { id, additional_data, ...data } = row;
            
            // Parse additional data if exists
            if (additional_data) {
                try {
                    const extra = JSON.parse(additional_data);
                    Object.assign(data, extra);
                } catch (e) {
                    // Ignore parsing errors
                }
            }

            return res.json({
                success: true,
                data: data
            });
        } else {
            return res.json({
                success: false,
                message: 'No record found matching your search'
            });
        }
    });
});

// API: Upload Excel file
app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.json({
            success: false,
            message: 'No file uploaded'
        });
    }

    try {
        // Read Excel file
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        if (data.length === 0) {
            fs.unlinkSync(req.file.path);
            return res.json({
                success: false,
                message: 'Excel file is empty'
            });
        }

        if (data.length > 200000) {
            fs.unlinkSync(req.file.path);
            return res.json({
                success: false,
                message: 'File contains too many records (max 200,000)'
            });
        }

        // Clear existing data
        await new Promise((resolve, reject) => {
            db.run('DELETE FROM licenses', (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // Prepare insert statement
        const stmt = db.prepare(`
            INSERT OR REPLACE INTO licenses 
            (license_number, applicant_id, name, address, date_of_birth, 
             license_type, issue_date, expiry_date, status, additional_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        // Insert data in batches for better performance
        const batchSize = 1000;
        let processed = 0;

        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            
            await new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run('BEGIN TRANSACTION');
                    
                    batch.forEach(row => {
                        // Extract known fields
                        const licenseNumber = (row['License Number'] || row['license_number'] || '').toString().toUpperCase();
                        const applicantId = (row['Applicant ID'] || row['applicant_id'] || '').toString();
                        const name = row['Name'] || row['name'] || '';
                        const address = row['Address'] || row['address'] || '';
                        const dob = row['Date of Birth'] || row['date_of_birth'] || '';
                        const licenseType = row['License Type'] || row['license_type'] || '';
                        const issueDate = row['Issue Date'] || row['issue_date'] || '';
                        const expiryDate = row['Expiry Date'] || row['expiry_date'] || '';
                        const status = row['Status'] || row['status'] || 'Active';

                        // Store additional fields as JSON
                        const knownFields = [
                            'License Number', 'license_number',
                            'Applicant ID', 'applicant_id',
                            'Name', 'name',
                            'Address', 'address',
                            'Date of Birth', 'date_of_birth',
                            'License Type', 'license_type',
                            'Issue Date', 'issue_date',
                            'Expiry Date', 'expiry_date',
                            'Status', 'status'
                        ];

                        const additionalData = {};
                        for (const key in row) {
                            if (!knownFields.includes(key) && row[key]) {
                                additionalData[key] = row[key];
                            }
                        }

                        stmt.run(
                            licenseNumber,
                            applicantId,
                            name,
                            address,
                            dob,
                            licenseType,
                            issueDate,
                            expiryDate,
                            status,
                            Object.keys(additionalData).length > 0 ? JSON.stringify(additionalData) : null
                        );
                    });

                    db.run('COMMIT', (err) => {
                        if (err) reject(err);
                        else {
                            processed += batch.length;
                            resolve();
                        }
                    });
                });
            });
        }

        stmt.finalize();

        // Update metadata
        const now = new Date().toISOString();
        db.run('INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)', 
            ['last_updated', now]);

        // Clean up uploaded file
        fs.unlinkSync(req.file.path);

        res.json({
            success: true,
            message: 'Data uploaded successfully',
            recordsProcessed: processed
        });

    } catch (error) {
        console.error('Upload error:', error);
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.json({
            success: false,
            message: 'Error processing file: ' + error.message
        });
    }
});

// API: Get statistics
app.get('/api/stats', (req, res) => {
    db.get('SELECT COUNT(*) as count FROM licenses', (err, result) => {
        if (err) {
            return res.json({
                success: false,
                totalRecords: 0,
                lastUpdated: 'Error'
            });
        }

        db.get('SELECT value FROM metadata WHERE key = ?', ['last_updated'], (err2, metadata) => {
            let lastUpdated = 'Never';
            if (!err2 && metadata) {
                const date = new Date(metadata.value);
                lastUpdated = date.toLocaleString();
            }

            res.json({
                success: true,
                totalRecords: result.count,
                lastUpdated: lastUpdated
            });
        });
    });
});

// API: Download template
app.get('/api/template', (req, res) => {
    const templateData = [
        {
            'License Number': '03-06-00123456',
            'Applicant ID': '6616133',
            'Name': 'John Doe',
            'Address': 'Kathmandu, Nepal',
            'Date of Birth': '1990-01-01',
            'License Type': 'Motorcycle',
            'Issue Date': '2024-01-15',
            'Expiry Date': '2029-01-15',
            'Status': 'Active'
        }
    ];

    const ws = xlsx.utils.json_to_sheet(templateData);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Licenses');

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    res.setHeader('Content-Disposition', 'attachment; filename=license_template.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
});

// API: Clear database
app.post('/api/clear', (req, res) => {
    db.run('DELETE FROM licenses', (err) => {
        if (err) {
            return res.json({
                success: false,
                message: 'Error clearing database'
            });
        }

        db.run('DELETE FROM metadata', () => {
            res.json({
                success: true,
                message: 'Database cleared successfully'
            });
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Admin password: admin123 (Change this in production!)');
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('Database connection closed');
        }
        process.exit(0);
    });
});
