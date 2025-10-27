# Variables for Salesforce Data Dictionary Infrastructure

variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "eshyft-salesforce-dev"
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "function_url" {
  description = "Cloud Function URL"
  type        = string
  default     = "https://updatedatadictionary-mct3tg54mq-uc.a.run.app"
}

variable "service_account_email" {
  description = "Service Account Email"
  type        = string
  default     = "salesforce-data-dictionary-syn@eshyft-salesforce-dev.iam.gserviceaccount.com"
}

variable "secret_names" {
  description = "List of Secret Manager secret names"
  type        = list(string)
  default = [
    "SF_REFRESH_TOKEN",
    "SF_CLIENT_ID",
    "SF_CLIENT_SECRET",
    "SF_INSTANCE_URL",
    "CREDENTIALS_PATH",
    "SPREADSHEET_ID"
  ]
}

