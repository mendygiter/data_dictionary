# Google Cloud Function Deployment Guide

## Prerequisites

1. **Google Cloud SDK (gcloud CLI)** installed
   ```bash
   # Check if installed
   gcloud --version
   
   # If not installed, visit: https://cloud.google.com/sdk/docs/install
   ```

2. **Authenticated with GCP**
   ```bash
   gcloud auth login
   gcloud config set project 13958241844
   ```

3. **Enable Required APIs**
   ```bash
   gcloud services enable cloudfunctions.googleapis.com
   gcloud services enable secretmanager.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable sheets.googleapis.com
   ```

## Step 1: Set Up Google Cloud Secrets

Before deploying, you need to create secrets in Google Cloud Secret Manager for all credentials:

### Create Secrets

```bash
# Salesforce Credentials
gcloud secrets create SF_REFRESH_TOKEN --data-file=- <<< "YOUR_SF_REFRESH_TOKEN"
gcloud secrets create SF_CLIENT_ID --data-file=- <<< "YOUR_SF_CLIENT_ID"
gcloud secrets create SF_CLIENT_SECRET --data-file=- <<< "YOUR_SF_CLIENT_SECRET"
gcloud secrets create SF_INSTANCE_URL --data-file=- <<< "https://eshyft--sandbox3.sandbox.my.salesforce.com"

# Google Sheets Credentials (Service Account JSON)
gcloud secrets create CREDENTIALS_PATH --data-file=/path/to/your/service-account-key.json

# Google Sheets Spreadsheet ID
gcloud secrets create SPREADSHEET_ID --data-file=- <<< "1AgDLT4BSKagdSSV0iLES3agv7v1P4SqNd7GMp1frQtY"
```

### Grant Cloud Function Access to Secrets

```bash
# Get the project number
PROJECT_NUMBER=$(gcloud projects describe 13958241844 --format="value(projectNumber)")

# Grant the default Cloud Functions service account access to secrets
gcloud secrets add-iam-policy-binding SF_REFRESH_TOKEN \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding SF_CLIENT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding SF_CLIENT_SECRET \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding SF_INSTANCE_URL \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding CREDENTIALS_PATH \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding SPREADSHEET_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Step 2: Deploy the Function

### Option A: Using the Deploy Script (Recommended)

```bash
# Make the script executable
chmod +x deploy.sh

# Run the deployment
./deploy.sh
```

### Option B: Manual Deployment

```bash
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

### Option C: Using npm script

```bash
npm run deploy
```

## Step 3: Test the Function

After deployment, you'll get a function URL. Test it:

```bash
# Get the function URL
FUNCTION_URL=$(gcloud functions describe updateDataDictionary --region=us-central1 --gen2 --format='value(serviceConfig.uri)')

# Test the function
curl $FUNCTION_URL
```

## Step 4: View Logs

```bash
# View recent logs
gcloud functions logs read updateDataDictionary --region=us-central1 --gen2 --limit=50

# Stream logs in real-time
gcloud functions logs read updateDataDictionary --region=us-central1 --gen2 --limit=50 --follow
```

## Step 5: Set Up Scheduled Execution (Optional)

To run this automatically on a schedule, use Cloud Scheduler:

```bash
# Create a Cloud Scheduler job (runs daily at 9 AM)
gcloud scheduler jobs create http data-dictionary-daily \
  --location=us-central1 \
  --schedule="0 9 * * *" \
  --uri=$FUNCTION_URL \
  --http-method=GET \
  --description="Daily Salesforce Data Dictionary Update"
```

## Updating the Function

After making code changes:

```bash
# Simply run the deploy script again
./deploy.sh
```

## Troubleshooting

### Check Function Status
```bash
gcloud functions describe updateDataDictionary --region=us-central1 --gen2
```

### Check Secret Access
```bash
gcloud secrets versions access latest --secret=SF_REFRESH_TOKEN
```

### Delete and Redeploy
```bash
gcloud functions delete updateDataDictionary --region=us-central1 --gen2
./deploy.sh
```

## Security Notes

- The function is currently set to `--allow-unauthenticated` for easy access
- For production, consider adding authentication:
  ```bash
  # Remove the --allow-unauthenticated flag and add:
  --ingress-settings=internal-only
  ```

## Cost Estimation

- **Cloud Functions**: ~$0.40 per million invocations
- **Secret Manager**: ~$0.06 per 10,000 access operations
- **Estimated monthly cost** for daily runs: < $1

## Support

For issues or questions:
1. Check the logs: `gcloud functions logs read updateDataDictionary --region=us-central1 --gen2 --limit=50`
2. Verify secrets are properly set up
3. Ensure all required APIs are enabled

