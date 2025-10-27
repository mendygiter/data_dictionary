# Salesforce Data Dictionary Automation

Automatically sync Salesforce object metadata to Google Sheets for easy documentation and tracking.

## Overview

This application fetches field metadata from Salesforce custom objects and writes it to Google Sheets, creating a live data dictionary that:

- ✅ **Preserves custom documentation** - Your manual notes, formulas, and descriptions stay intact
- ✅ **Appends new fields** - Automatically adds newly created Salesforce fields
- ✅ **Highlights deleted fields** - Marks removed fields with red background
- ✅ **Updates metadata** - Keeps field labels, API names, help text, and data types current

## Currently Tracked Objects

- `Shift__c`
- `Application__c`
- `TimeCards__c`

## Project Structure

```
├── function.js          # Google Cloud Function (production)
├── index.js            # Local development server
├── deploy.sh           # Deployment script
├── package.json        # Dependencies
├── DEPLOYMENT_GUIDE.md # Detailed deployment instructions
└── README.md           # This file
```

## Quick Start

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create `.env` file**
   ```env
   CREDENTIALS_PATH=/path/to/google-service-account.json
   SF_REFRESH_TOKEN=your_refresh_token
   SF_ACCESS_TOKEN=your_access_token
   SF_INSTANCE_URL=https://eshyft--sandbox3.sandbox.my.salesforce.com
   SF_CLIENT_ID=your_client_id
   SF_CLIENT_SECRET=your_client_secret
   SF_REDIRECT_URI=http://localhost:4000/auth/salesforce/callback
   ```

3. **Run locally**
   ```bash
   node index.js
   ```

4. **Access endpoints**
   - `http://localhost:4000/` - Welcome page
   - `http://localhost:4000/update-dictionary` - Trigger update
   - `http://localhost:4000/auth/salesforce` - OAuth flow

### Deploy to Google Cloud Functions

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for complete instructions.

**Quick deploy:**
```bash
./deploy.sh
```

## How It Works

1. **Connect to Salesforce** using OAuth with refresh token
2. **Fetch metadata** for specified custom objects
3. **Read existing sheet data** to preserve custom columns
4. **Compare and update**:
   - Existing fields → Update Salesforce columns only
   - New fields → Append to bottom
   - Deleted fields → Highlight entire row in red
5. **Write to Google Sheets** with preserved custom data

## Google Sheets Structure

| Column | Source | Editable |
|--------|--------|----------|
| A - Field Label | Salesforce | Auto-updated |
| B - Field Name | Salesforce | Auto-updated |
| C - API Name | Salesforce | Auto-updated (Key field) |
| D - Help Text | Salesforce | Auto-updated |
| E - Data Type | Salesforce | Auto-updated |
| F+ - Custom Columns | Manual | ✅ Preserved |

## Configuration

### Add More Objects

Edit the `objectToPull` array in `function.js` or `index.js`:

```javascript
const objectToPull = ['Shift__c', 'Application__c', 'TimeCards__c', 'YourObject__c'];
```

### Change Target Spreadsheet

Update the spreadsheet ID in the code or in Google Cloud Secrets.

## Requirements

- **Node.js** 18+
- **Google Cloud Project** with:
  - Cloud Functions API
  - Secret Manager API
  - Google Sheets API
- **Salesforce Connected App** with:
  - OAuth enabled
  - Refresh token
- **Google Service Account** with:
  - Sheets API access
  - Edit permissions on target spreadsheet

## License

ISC

## Support

For deployment issues, see [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
