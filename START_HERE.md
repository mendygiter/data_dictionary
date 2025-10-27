# 🚀 Start Here - Deploy Your Data Dictionary

## Important: Switch GCP Project First!

You're currently on project: **closet-app-460703**  
You need to switch to: **13958241844** (Data Dictionary project)

```bash
# Switch to the data dictionary project
gcloud config set project 13958241844

# Verify the switch
gcloud config get-value project
```

## Quick Deploy (3 Steps)

### Step 1: Enable APIs (One-Time Setup)
```bash
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable sheets.googleapis.com
```

### Step 2: Set Up Secrets (One-Time Setup)
```bash
# Interactive setup - will prompt you for each credential
./setup-secrets.sh
```

**You'll need to provide:**
- Salesforce Refresh Token
- Salesforce Client ID  
- Salesforce Client Secret
- Salesforce Instance URL: `https://eshyft--sandbox3.sandbox.my.salesforce.com`
- Google Service Account JSON file path
- Spreadsheet ID: `1AgDLT4BSKagdSSV0iLES3agv7v1P4SqNd7GMp1frQtY`

### Step 3: Deploy!
```bash
./deploy.sh
```

That's it! 🎉

## What Happens Next?

The deploy script will:
1. ✅ Upload your code to Google Cloud Functions
2. ✅ Install dependencies (googleapis, jsforce, etc.)
3. ✅ Configure the function with 512MB memory and 9-minute timeout
4. ✅ Give you a public URL to trigger the function

## After Deployment

### Get Your Function URL
```bash
gcloud functions describe updateDataDictionary \
  --region=us-central1 \
  --gen2 \
  --format='value(serviceConfig.uri)'
```

### Test It
```bash
# Replace with your actual function URL
curl https://your-function-url.run.app
```

### Check Logs
```bash
gcloud functions logs read updateDataDictionary \
  --region=us-central1 \
  --gen2 \
  --limit=50
```

### View Results
Open your Google Sheet:
```
https://docs.google.com/spreadsheets/d/1AgDLT4BSKagdSSV0iLES3agv7v1P4SqNd7GMp1frQtY
```

You should see tabs for:
- Shift__c
- Application__c
- TimeCards__c

## Optional: Schedule Daily Updates

```bash
# Get your function URL first
FUNCTION_URL=$(gcloud functions describe updateDataDictionary \
  --region=us-central1 \
  --gen2 \
  --format='value(serviceConfig.uri)')

# Create daily schedule at 9 AM
gcloud scheduler jobs create http data-dictionary-daily \
  --location=us-central1 \
  --schedule="0 9 * * *" \
  --uri=$FUNCTION_URL \
  --http-method=GET \
  --description="Daily Salesforce Data Dictionary Update"
```

## Need More Help?

- **Complete Guide**: See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **Command Reference**: See [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- **Detailed Checklist**: See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
- **Project Overview**: See [README.md](README.md)

## Troubleshooting

### "Permission denied" errors?
Make sure you're on the right project:
```bash
gcloud config get-value project
# Should show: 13958241844
```

### Function fails to deploy?
Check that all APIs are enabled:
```bash
gcloud services list --enabled | grep -E 'cloudfunctions|secretmanager'
```

### Function runs but fails?
Check the logs:
```bash
gcloud functions logs read updateDataDictionary \
  --region=us-central1 \
  --gen2 \
  --limit=50
```

Most common issues:
- Secrets not set up correctly → Run `./setup-secrets.sh`
- Service account doesn't have access to secrets → See DEPLOYMENT_GUIDE.md
- Service account doesn't have edit access to spreadsheet → Share the sheet with your service account email

---

**Ready to deploy?** Start with Step 1 above! 🚀

