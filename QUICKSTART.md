# Quick Start Guide

## For Windows

1. Install Node.js from https://nodejs.org (download LTS version)

2. Open Command Prompt in the project folder

3. Install dependencies:
```cmd
npm install
```

4. Start the server:
```cmd
npm start
```

5. Open your browser to:
- User Search: http://localhost:3000
- Admin Panel: http://localhost:3000/admin.html

## For Mac/Linux

1. Install Node.js:
```bash
# Mac (using Homebrew)
brew install node

# Ubuntu/Debian
sudo apt update
sudo apt install nodejs npm
```

2. Navigate to project folder and install:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

4. Access the application:
- User Search: http://localhost:3000
- Admin Panel: http://localhost:3000/admin.html

## First Time Setup

1. Access admin panel: http://localhost:3000/admin.html
2. Enter password: `admin123`
3. Download the Excel template
4. Fill in your license data using the template format
5. Upload the Excel file
6. Test the search functionality

## Excel Data Format

Your Excel file should have these columns (minimum):

| License Number | Applicant ID | Name     | Address  | License Type | Status |
|---------------|--------------|----------|----------|--------------|--------|
| 03-06-00123456| 6616133      | John Doe | Kathmandu| Motorcycle   | Active |

The system supports additional custom columns.

## Important Security Notes

⚠️ **Before going live:**
1. Change admin password in `admin.js` (line 7)
2. Set up HTTPS/SSL certificate
3. Configure firewall rules
4. Regular database backups

## Troubleshooting

**Server won't start:**
- Check if port 3000 is already in use
- Try: `npm start` again
- Check Node.js is installed: `node --version`

**Can't upload file:**
- Ensure file is .xlsx or .xls format
- Check file size is under 50MB
- Verify you have write permissions

**Search returns nothing:**
- Verify data was uploaded successfully
- Check Admin panel for total records count
- Ensure search format is correct (XX-XX-XXXXXXXX for license)

## Support

For technical issues, check README.md for detailed documentation.
