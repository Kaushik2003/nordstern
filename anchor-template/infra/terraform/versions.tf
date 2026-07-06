terraform {
  required_version = ">= 1.6"

  required_providers {
    aws    = { source = "hashicorp/aws", version = "~> 5.60" }
    random = { source = "hashicorp/random", version = "~> 3.6" }
  }

  # Remote state — create the bucket + lock table once, then uncomment and re-init.
  # backend "s3" {
  #   bucket         = "nordstern-tfstate"
  #   key            = "anchor/phase1/terraform.tfstate"
  #   region         = "ap-south-1"
  #   dynamodb_table = "nordstern-tflock"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Project = var.project
      Env     = var.env
      Managed = "terraform"
    }
  }
}
