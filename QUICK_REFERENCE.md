# Quick Reference Guide

## 🚀 Deployment Commands

### First-Time Setup
```bash
# 1. Enable required APIs
gcloud services enable cloudfunctions.googleapis.com secretmanager.googleapis.com cloudbuild.googleapis.com sheets.googleapis.com

# 2. Set up secrets (interactive)
./setup-secrets.sh

# 3. Deploy function
./deploy.sh
```

### Update Existing Deployment
```bash
# Make code changes, then:
./deploy.sh
```

## 🔐 Secret Management

### List all secrets
```bash
gcloud secrets list
```

### View a secret value
```bash
gcloud secrets versions access latest --secret=SF_REFRESH_TOKEN
```

### Update a secret
```bash
# From stdin
echo "new_value" | gcloud secrets versions add SECRET_NAME --data-file=-

# From file
gcloud secrets versions add CREDENTIALS_PATH --data-file=/path/to/file.json
```

### Delete a secret
```bash
gcloud secrets delete SECRET_NAME
```

## 📊 Function Management

### Get function URL
```bash
gcloud functions describe updateDataDictionary --region=us-central1 --gen2 --format='value(serviceConfig.uri)'
```

### Test function
```bash
FUNCTION_URL=$(gcloud functions describe updateDataDictionary --region=us-central1 --gen2 --format='value(serviceConfig.uri)')
curl $FUNCTION_URL
```

### View logs (last 50 entries)
```bash
gcloud functions logs read updateDataDictionary --region=us-central1 --gen2 --limit=50
```

### Stream logs in real-time
```bash
gcloud functions logs read updateDataDictionary --region=us-central1 --gen2 --follow
```

### View function details
```bash
gcloud functions describe updateDataDictionary --region=us-central1 --gen2
```

### Delete function
```bash
gcloud functions delete updateDataDictionary --region=us-central1 --gen2
```

## ⏰ Scheduling (Cloud Scheduler)

### Create daily schedule (9 AM)
```bash
FUNCTION_URL=$(gcloud functions describe updateDataDictionary --region=us-central1 --gen2 --format='value(serviceConfig.uri)')

gcloud scheduler jobs create http data-dictionary-daily \
  --location=us-central1 \
  --schedule="0 9 * * *" \
  --uri=$FUNCTION_URL \
  --http-method=GET \
  --description="Daily Salesforce Data Dictionary Update"
```

### List scheduled jobs
```bash
gcloud scheduler jobs list --location=us-central1
```

### Manually trigger scheduled job
```bash
gcloud scheduler jobs run data-dictionary-daily --location=us-central1
```

### Update schedule
```bash
gcloud scheduler jobs update http data-dictionary-daily \
  --location=us-central1 \
  --schedule="0 8 * * *"  # Change to 8 AM
```

### Delete scheduled job
```bash
gcloud scheduler jobs delete data-dictionary-daily --location=us-central1
```

## 🐛 Troubleshooting

### Check if APIs are enabled
```bash
gcloud services list --enabled | grep -E 'cloudfunctions|secretmanager|sheets'
```

### Check IAM permissions for secrets
```bash
gcloud secrets get-iam-policy SF_REFRESH_TOKEN
```

### Test Salesforce connection locally
```bash
node index.js
# Then visit: http://localhost:4000/update-dictionary
```

### View Cloud Build logs (deployment)
```bash
gcloud builds list --limit=5
gcloud builds log [BUILD_ID]
```

## 📝 Common Schedule Patterns

```bash
# Every hour
--schedule="0 * * * *"

# Every day at 9 AM
--schedule="0 9 * * *"

# Every Monday at 9 AM
--schedule="0 9 * * 1"

# Every 6 hours
--schedule="0 */6 * * *"

# First day of month at midnight
--schedule="0 0 1 * *"
```

## 🔄 Development Workflow

1. **Make changes locally**
   ```bash
   # Test with local server
   node index.js
   ```

2. **Test the update endpoint**
   ```bash
   curl http://localhost:4000/update-dictionary
   ```

3. **Deploy to GCP**
   ```bash
   ./deploy.sh
   ```

4. **Verify deployment**
   ```bash
   # Get function URL
   FUNCTION_URL=$(gcloud functions describe updateDataDictionary --region=us-central1 --gen2 --format='value(serviceConfig.uri)')
   
   # Test
   curl $FUNCTION_URL
   
   # Check logs
   gcloud functions logs read updateDataDictionary --region=us-central1 --gen2 --limit=20
   ```

## 📦 Project Structure

```
.
├── function.js              # Cloud Function entry point
├── index.js                 # Local development server
├── package.json             # Dependencies
├── deploy.sh               # Deployment script
├── setup-secrets.sh        # Secrets setup script
├── DEPLOYMENT_GUIDE.md     # Detailed guide
├── QUICK_REFERENCE.md      # This file
└── README.md               # Project overview
```

## 🆘 Getting Help

- **GCP Documentation**: https://cloud.google.com/functions/docs
- **Salesforce JSforce**: https://jsforce.github.io/
- **Google Sheets API**: https://developers.google.com/sheets/api

