terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.27"
    }
  }

   backend "s3" {
     bucket          = "syrf-polar-scraper-prod-terraform-state"
     key             = "global/s3/terraform.tfstate"
     region          = "us-east-2"
     dynamodb_table  = "polar-scraper-prod-tf-state-locking"
     encrypt         = true
   }

}
