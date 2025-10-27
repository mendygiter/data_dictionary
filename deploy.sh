#!/bin/bash

# Salesforce Data Dictionary - GCP Cloud Function Deployment Script
# This script deploys the data dictionary function to Google Cloud Functions

# Configuration
PROJECT_ID="eshyft-salesforce-dev"
FUNCTION_NAME="updateDataDictionary"
REGION="us-central1"
RUNTIME="nodejs20"
ENTRY_POINT="updateDataDictionary"
MEMORY="512MB"
TIMEOUT="540s"

echo "🚀 Deploying Salesforce Data Dictionary to Google Cloud Functions..."
echo "Project ID: $PROJECT_ID"
echo "Function Name: $FUNCTION_NAME"
echo "Region: $REGION"
echo ""

# Set the active project
echo "Setting active GCP project..."
gcloud config set project $PROJECT_ID

# Deploy the function
echo "Deploying Cloud Function..."
gcloud functions deploy $FUNCTION_NAME \
  --gen2 \
  --runtime=$RUNTIME \
  --region=$REGION \
  --source=. \
  --entry-point=$ENTRY_POINT \
  --trigger-http \
  --allow-unauthenticated \
  --memory=$MEMORY \
  --timeout=$TIMEOUT \
  --max-instances=10

# Check if deployment was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Deployment successful!"
    echo ""
    echo "Getting function URL..."
    FUNCTION_URL=$(gcloud functions describe $FUNCTION_NAME --region=$REGION --gen2 --format='value(serviceConfig.uri)')
    echo ""
    echo "🌐 Function URL: $FUNCTION_URL"
    echo ""
    echo "To test the function, run:"
    echo "curl $FUNCTION_URL"
    echo ""
    echo "To view logs, run:"
    echo "gcloud functions logs read $FUNCTION_NAME --region=$REGION --gen2 --limit=50"
else
    echo ""
    echo "❌ Deployment failed. Please check the error messages above."
    exit 1
fi

