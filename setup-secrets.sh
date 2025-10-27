#!/bin/bash

# Salesforce Data Dictionary - Secret Manager Setup Script
# This script helps you set up all required secrets in Google Cloud Secret Manager

PROJECT_ID="13958241844"

echo "🔐 Setting up Google Cloud Secrets for Salesforce Data Dictionary"
echo "Project ID: $PROJECT_ID"
echo ""

# Set the active project
gcloud config set project $PROJECT_ID

# Check if user wants to create or update secrets
echo "This script will guide you through creating the required secrets."
echo ""

# Function to create or update a secret
create_or_update_secret() {
    local SECRET_NAME=$1
    local DESCRIPTION=$2
    local IS_FILE=$3
    
    echo "-----------------------------------"
    echo "Setting up: $SECRET_NAME"
    echo "Description: $DESCRIPTION"
    
    # Check if secret exists
    if gcloud secrets describe $SECRET_NAME &>/dev/null; then
        echo "Secret '$SECRET_NAME' already exists."
        read -p "Do you want to update it? (y/n): " UPDATE
        if [ "$UPDATE" != "y" ]; then
            echo "Skipping $SECRET_NAME"
            return
        fi
    else
        echo "Creating new secret: $SECRET_NAME"
        gcloud secrets create $SECRET_NAME --replication-policy="automatic"
    fi
    
    # Get the value
    if [ "$IS_FILE" = "true" ]; then
        read -p "Enter the file path for $SECRET_NAME: " FILE_PATH
        if [ -f "$FILE_PATH" ]; then
            gcloud secrets versions add $SECRET_NAME --data-file="$FILE_PATH"
            echo "✅ Secret '$SECRET_NAME' updated from file"
        else
            echo "❌ File not found: $FILE_PATH"
            return
        fi
    else
        read -sp "Enter value for $SECRET_NAME: " SECRET_VALUE
        echo ""
        if [ -n "$SECRET_VALUE" ]; then
            echo "$SECRET_VALUE" | gcloud secrets versions add $SECRET_NAME --data-file=-
            echo "✅ Secret '$SECRET_NAME' updated"
        else
            echo "❌ No value provided, skipping"
            return
        fi
    fi
}

# Create all required secrets
echo "Setting up Salesforce credentials..."
create_or_update_secret "SF_REFRESH_TOKEN" "Salesforce OAuth Refresh Token" false
create_or_update_secret "SF_CLIENT_ID" "Salesforce Connected App Client ID" false
create_or_update_secret "SF_CLIENT_SECRET" "Salesforce Connected App Client Secret" false
create_or_update_secret "SF_INSTANCE_URL" "Salesforce Instance URL (e.g., https://your-instance.salesforce.com)" false

echo ""
echo "Setting up Google Sheets credentials..."
create_or_update_secret "CREDENTIALS_PATH" "Google Service Account JSON file" true
create_or_update_secret "SPREADSHEET_ID" "Google Sheets Spreadsheet ID" false

echo ""
echo "-----------------------------------"
echo "Setting up IAM permissions..."
echo ""

# Get the project number
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

# Grant access to all secrets
for SECRET_NAME in SF_REFRESH_TOKEN SF_CLIENT_ID SF_CLIENT_SECRET SF_INSTANCE_URL CREDENTIALS_PATH SPREADSHEET_ID; do
    echo "Granting access to $SECRET_NAME..."
    gcloud secrets add-iam-policy-binding $SECRET_NAME \
      --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
      --role="roles/secretmanager.secretAccessor" &>/dev/null
done

echo ""
echo "✅ All secrets configured successfully!"
echo ""
echo "You can now deploy the function using:"
echo "  ./deploy.sh"
echo ""
echo "To verify secrets, run:"
echo "  gcloud secrets list"
echo ""
echo "To view a secret value, run:"
echo "  gcloud secrets versions access latest --secret=SECRET_NAME"

