# Salesforce Data Dictionary - Terraform Configuration
# This file defines the infrastructure for the data dictionary Cloud Function

terraform {
  required_version = ">= 1.0"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Cloud Scheduler Job - Runs daily at 9 AM
resource "google_cloud_scheduler_job" "data_dictionary_daily" {
  name        = "data-dictionary-daily"
  description = "Daily Salesforce Data Dictionary Update at 9 AM"
  schedule    = "0 9 * * *"
  time_zone   = "Etc/UTC"
  region      = var.region

  http_target {
    uri         = var.function_url
    http_method = "GET"

    oidc_token {
      service_account_email = var.service_account_email
    }
  }

  retry_config {
    retry_count = 3
  }
}

# IAM Binding - Allow service account to invoke the Cloud Run service
resource "google_cloud_run_service_iam_member" "scheduler_invoker" {
  service  = "updatedatadictionary"
  location = var.region
  role     = "roles/run.invoker"
  member   = "serviceAccount:${var.service_account_email}"
}

# IAM Binding - Allow service account to access Secret Manager
resource "google_secret_manager_secret_iam_member" "secret_accessor" {
  for_each = toset(var.secret_names)
  
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.service_account_email}"
}

