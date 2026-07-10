data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  name = "${var.project}-${var.env}"
  azs  = slice(data.aws_availability_zones.available.names, 0, 3)
}

# 3-AZ VPC with three subnet tiers:
#   public       — ALB + NAT gateways (only ingress/egress edge lives here)
#   private-app  — EKS nodes / pods (egress via NAT + VPC endpoints)
#   private-data — Aurora (no internet route; reachable only from the node SG)
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.8"

  name = "${local.name}-vpc"
  cidr = var.vpc_cidr
  azs  = local.azs

  public_subnets   = [for k, _ in local.azs : cidrsubnet(var.vpc_cidr, 8, k)]      # /24
  private_subnets  = [for k, _ in local.azs : cidrsubnet(var.vpc_cidr, 4, k + 1)]  # /20 (app)
  database_subnets = [for k, _ in local.azs : cidrsubnet(var.vpc_cidr, 8, k + 48)] # /24 (data)

  enable_nat_gateway   = true
  single_nat_gateway   = var.env == "dev" # one NAT in dev to save cost; per-AZ in prod
  enable_dns_hostnames = true

  create_database_subnet_group = true

  # Subnet discovery tags for the AWS Load Balancer Controller + Karpenter.
  public_subnet_tags  = { "kubernetes.io/role/elb" = "1" }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
    "karpenter.sh/discovery"          = local.name
  }
}
