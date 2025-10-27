# Deployment Checklist

## ✅ Pre-Deployment Setup

### 1. Verify GCP Project
**Current Status:**
- ✅ gcloud CLI installed (version 523.0.0)
- ✅ Authenticated as: `mendygiter@gmail.com`
- ⚠️  Current project: `closet-app-460703`
- ⚠️  Target project: `13958241844`

**Action Required:**
```bash
# Switch to the correct project
gcloud config set project 13958241844

# Verify the switch
gcloud config get-value project
```

### 2. Enable Required APIs
```bash
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable sheets.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
```

### 3. Prepare Your Credentials

You'll need:
- [ ] **Salesforce Refresh Token** - From your Salesforce Connected App
- [ ] **Salesforce Client ID** - From your Salesforce Connected App
- [ ] **Salesforce Client Secret** - From your Salesforce Connected App
- [ ] **Salesforce Instance URL** - `https://eshyft--sandbox3.sandbox.my.salesforce.com`
- [ ] **Google Service Account JSON** - Download from GCP Console
- [ ] **Google Sheets Spreadsheet ID** - From your target spreadsheet URL

**Current spreadsheet ID in code:** `1AgDLT4BSKagdSSV0iLES3agv7v1P4SqNd7GMp1frQtY`

### 4. Set Up Secrets
```bash
# Run the interactive setup script
./setup-secrets.sh

# Or manually create each secret:
echo "YOUR_REFRESH_TOKEN" | gcloud secrets create SF_REFRESH_TOKEN --data-file=-
echo "YOUR_CLIENT_ID" | gcloud secrets create SF_CLIENT_ID --data-file=-
echo "YOUR_CLIENT_SECRET" | gcloud secrets create SF_CLIENT_SECRET --data-file=-
echo "https://eshyft--sandbox3.sandbox.my.salesforce.com" | gcloud secrets create SF_INSTANCE_URL --data-file=-
gcloud secrets create CREDENTIALS_PATH --data-file=/path/to/service-account.json
echo "1AgDLT4BSKagdSSV0iLES3agv7v1P4SqNd7GMp1frQtY" | gcloud secrets create SPREADSHEET_ID --data-file=-
```

## 🚀 Deployment Steps

### Step 1: Review Configuration

Check `function.js` for:
```javascript
// Line 9: Verify project ID
const PROJECT_ID = '13958241844';

// Lines 272-273: Verify objects to sync
const objectToPull = ['Shift__c', 'Application__c', 'TimeCards__c'];
```

### Step 2: Deploy Function

```bash
# Option A: Use the deployment script (recommended)
./deploy.sh

# Option B: Manual deployment
gcloud functions deploy updateDataDictionary \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=updateDataDictionary \
  --trigger-http \
  --allow-unauthenticated \
  --memory=512MB \
  --timeout=540s \
  --max-instances=10
```

### Step 3: Test Deployment

```bash
# Get the function URL
FUNCTION_URL=$(gcloud functions describe updateDataDictionary \
  --region=us-central1 \
  --gen2 \
  --format='value(serviceConfig.uri)')

echo "Function URL: $FUNCTION_URL"

# Test the function
curl $FUNCTION_URL

# Check logs
gcloud functions logs read updateDataDictionary \
  --region=us-central1 \
  --gen2 \
  --limit=50
```

### Step 4: Set Up Automated Schedule (Optional)

```bash
# Create daily schedule at 9 AM
gcloud scheduler jobs create http data-dictionary-daily \
  --location=us-central1 \
  --schedule="0 9 * * *" \
  --uri=$FUNCTION_URL \
  --http-method=GET \
  --description="Daily Salesforce Data Dictionary Update"

# Verify the schedule
gcloud scheduler jobs list --location=us-central1
```

## 🧪 Testing Locally (Optional)

Before deploying, you can test locally:

### 1. Install dependencies
```bash
npm install
```

### 2. Create `.env` file
```bash
cat > .env << EOF
CREDENTIALS_PATH=/path/to/google-service-account-key.json
SF_REFRESH_TOKEN=your_refresh_token
SF_ACCESS_TOKEN=your_access_token
SF_INSTANCE_URL=https://eshyft--sandbox3.sandbox.my.salesforce.com
SF_CLIENT_ID=your_client_id
SF_CLIENT_SECRET=your_client_secret
SF_REDIRECT_URI=http://localhost:4000/auth/salesforce/callback
EOF
```

### 3. Run locally
```bash
node index.js
```

### 4. Test the endpoint
```bash
curl http://localhost:4000/update-dictionary
```

## 📊 Post-Deployment Verification

### Check Function Status
```bash
gcloud functions describe updateDataDictionary --region=us-central1 --gen2
```

### Verify Secrets Access
```bash
# List all secrets
gcloud secrets list

# Test accessing a secret
gcloud secrets versions access latest --secret=SF_REFRESH_TOKEN
```

### Monitor Logs
```bash
# View recent logs
gcloud functions logs read updateDataDictionary --region=us-central1 --gen2 --limit=50

# Stream logs in real-time
gcloud functions logs read updateDataDictionary --region=us-central1 --gen2 --follow
```

### Check Google Sheets
1. Open your target spreadsheet: `https://docs.google.com/spreadsheets/d/1AgDLT4BSKagdSSV0iLES3agv7v1P4SqNd7GMp1frQtY`
2. Verify that tabs exist for: `Shift__c`, `Application__c`, `TimeCards__c`
3. Check that data has been populated
4. Verify custom columns are preserved (if applicable)

## 🔧 Troubleshooting

### Permission Denied Errors
```bash
# Grant secret access to Cloud Function service account
PROJECT_NUMBER=$(gcloud projects describe 13958241844 --format="value(projectNumber)")

for SECRET in SF_REFRESH_TOKEN SF_CLIENT_ID SF_CLIENT_SECRET SF_INSTANCE_URL CREDENTIALS_PATH SPREADSHEET_ID; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done
```

### Salesforce Connection Issues
- Verify refresh token is valid
- Check that Connected App is properly configured
- Ensure instance URL is correct

### Google Sheets Issues
- Verify service account has edit access to the spreadsheet
- Check that Sheets API is enabled
- Confirm spreadsheet ID is correct

## 📝 Quick Commands Reference

See [QUICK_REFERENCE.md](QUICK_REFERENCE.md) for more commands.

```bash
# Deploy
./deploy.sh

# View logs
gcloud functions logs read updateDataDictionary --region=us-central1 --gen2 --limit=50

# Test function
curl $(gcloud functions describe updateDataDictionary --region=us-central1 --gen2 --format='value(serviceConfig.uri)')

# Update secrets
./setup-secrets.sh
```

## ✅ Success Criteria

Your deployment is successful when:
- [ ] Function deploys without errors
- [ ] Function URL returns 200 status
- [ ] Logs show "Data dictionary updated successfully"
- [ ] All three objects appear as tabs in Google Sheets
- [ ] Field data is populated correctly
- [ ] Custom columns are preserved (if applicable)
- [ ] New fields are appended
- [ ] Deleted fields are marked red

## 🎯 Next Steps After Successful Deployment

1. **Add more objects** - Edit `function.js` line 272
2. **Set up monitoring** - Configure Cloud Monitoring alerts
3. **Add authentication** - Remove `--allow-unauthenticated` flag
4. **Schedule regular updates** - Use Cloud Scheduler
5. **Customize columns** - Add your own documentation in sheets

---

**Need Help?** Check:
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Detailed instructions
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) - Command reference
- [README.md](README.md) - Project overview

