# Terraform Configuration for Data Dictionary

This directory contains Terraform configuration to manage the infrastructure for the Salesforce Data Dictionary project.

## What This Does

This Terraform code manages:

1. **Cloud Scheduler Job** - Runs the function daily at 9 AM
2. **IAM Permissions** - Allows the service account to invoke the function
3. **Secret Manager Access** - Grants access to all required secrets

## Prerequisites

1. **Install Terraform** (if not already installed):

   ```bash
   # On Mac with Homebrew
   brew install terraform

   # Verify installation
   terraform version
   ```

2. **Authenticate with GCP**:
   ```bash
   gcloud auth application-default login
   ```

## Quick Start

### Step 1: Initialize Terraform

This downloads the required providers (only needed once):

```bash
cd terraform
terraform init
```

### Step 2: Preview Changes

See what Terraform will do (without making changes):

```bash
terraform plan
```

This shows you:

- ✅ Resources that will be created (green `+`)
- ⚠️ Resources that will be modified (yellow `~`)
- ❌ Resources that will be deleted (red `-`)

### Step 3: Apply Changes

Actually create/update the resources:

```bash
terraform apply
```

It will ask for confirmation. Type `yes` to proceed.

### Step 4: Verify

Check the outputs:

```bash
terraform output
```

## Important Notes

### Scheduler Already Exists

The Cloud Scheduler job `data-dictionary-daily` was already created manually. When you run `terraform apply`, you have two options:

**Option A: Import Existing Resource** (Recommended)

```bash
# Import the existing scheduler job
terraform import google_cloud_scheduler_job.data_dictionary_daily projects/eshyft-salesforce-dev/locations/us-central1/jobs/data-dictionary-daily
```

**Option B: Let Terraform Recreate It**
Delete the manual one first:

```bash
gcloud scheduler jobs delete data-dictionary-daily --location=us-central1 --project=eshyft-salesforce-dev --quiet
```

## Common Commands

```bash
# Initialize (first time only)
terraform init

# See what will change
terraform plan

# Apply changes
terraform apply

# Destroy everything (careful!)
terraform destroy

# Show current state
terraform show

# List all resources
terraform state list
```

## File Structure

```
terraform/
├── main.tf         # Main infrastructure definitions
├── variables.tf    # Input variables with defaults
├── outputs.tf      # Output values after apply
└── README.md       # This file
```

## What Each Resource Does

### `google_cloud_scheduler_job.data_dictionary_daily`

Creates a cron job that runs daily at 9 AM UTC and calls your Cloud Function.

### `google_cloud_run_service_iam_member.scheduler_invoker`

**THIS IS THE KEY ONE!** Grants permission for the service account to invoke the Cloud Run service. Without this, the scheduler gets "403 Forbidden".

### `google_secret_manager_secret_iam_member.secret_accessor`

Ensures the service account can read all required secrets from Secret Manager.

## Modifying the Configuration

### Change the Schedule

Edit `main.tf` line 21:

```hcl
schedule = "0 9 * * *"  # 9 AM daily
# Examples:
# "0 */6 * * *"  # Every 6 hours
# "0 8 * * 1"    # 8 AM every Monday
# "0 0 1 * *"    # Midnight on 1st of month
```

### Change the Region

Edit `variables.tf` line 10:

```hcl
default = "us-central1"
```

## Working with Your Admin

If your company uses Terragrunt or has an existing Terraform repo:

1. **Find the existing repo** - Ask where infrastructure code lives
2. **Create a new module** - This `terraform/` folder can become a module
3. **Submit a PR** - Add your changes through pull request
4. **Let admin apply** - They'll review and apply through CI/CD

## Troubleshooting

### "Resource already exists"

The resource was created manually. Use `terraform import` to bring it under Terraform management.

### "Permission denied"

Your GCP account needs these roles:

- `roles/cloudfunctions.admin`
- `roles/cloudscheduler.admin`
- `roles/iam.securityAdmin`

Ask your admin if you don't have these.

### "Backend configuration required"

Your company might use remote state (GCS bucket). Ask your admin for the backend config.

## Next Steps

After applying this Terraform:

1. Test the scheduler: `gcloud scheduler jobs run data-dictionary-daily --location=us-central1 --project=eshyft-salesforce-dev`
2. Check logs: `gcloud functions logs read updateDataDictionary --region=us-central1 --gen2 --limit=30`
3. Verify sheets: Check that your Google Sheet updated successfully

## Questions?

Ask your admin about:

- Where is the company's main Terraform repo?
- Do you use Terragrunt? (adds extra layer of config)
- Is there a CI/CD pipeline for infrastructure changes?
- Should this be in a separate module?
