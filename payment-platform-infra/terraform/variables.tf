variable "aws_region" {
  type        = string
  description = "The target AWS Region"
  default     = "us-east-1"
}

variable "environment" {
  type        = string
  description = "Deployment environment name (e.g. dev, staging, prod)"
  default     = "production"
}

variable "db_password" {
  type        = string
  description = "Administrator password for RDS PostgreSQL"
  sensitive   = true
}

variable "ecr_repo_url" {
  type        = string
  description = "ECR Repository URI for payment-platform-core image"
  default     = "123456789012.dkr.ecr.us-east-1.amazonaws.com/payment-core"
}
