variable "aws_region" {
  default     = "us-east-2"
  description = "Which region should the resources be deployed into?"
}

variable "aws_subnets_cidr" {
  default     = ["10.16.1.0/24", "10.16.16.0/24", "10.16.32.0/24"]
  description = "List of Cidr blocks"
}

variable "aws_availability_zones" {
  default     = ["us-east-2a", "us-east-2b", "us-east-2c"]
  description = "Availability zone list"
}

variable "iam_ecsTaskExecution_role" {
  default     = "arn:aws:iam::335855654610:role/ecsTaskExecutionRole"
  description = "The IAM Role to run ECS Task"
}

variable "task_name" {
  default = "polar-scraper-task"
}

variable "scraper_runner_arn" {
  default     = "arn:aws:ecs:us-east-2:335855654610:cluster/scraper-runner"
  description = "The cluster of scraper runner on DEV"
}