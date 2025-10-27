# Outputs for verification

output "scheduler_job_name" {
  description = "Name of the Cloud Scheduler job"
  value       = google_cloud_scheduler_job.data_dictionary_daily.name
}

output "scheduler_job_schedule" {
  description = "Schedule for the Cloud Scheduler job"
  value       = google_cloud_scheduler_job.data_dictionary_daily.schedule
}

output "function_url" {
  description = "URL of the Cloud Function"
  value       = var.function_url
}

output "service_account_email" {
  description = "Service account with permissions"
  value       = var.service_account_email
}

