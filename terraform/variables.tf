variable "region" {
  description = "The AWS region to deploy resources in."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "The name of the project."
  type        = string
  default     = "book-slot"
}

variable "environment" {
  description = "The environment for the deployment (e.g., dev, staging, prod)."
  type        = string
  default     = "prod"
}

variable "terraform_state_bucket" {
  description = "The S3 bucket name for storing Terraform state."
  type        = string
  default     = "book-slot-tfstate-746143677067-us-east-1-an"
}
