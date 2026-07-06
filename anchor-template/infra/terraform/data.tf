# Aurora PostgreSQL (Serverless v2) — replaces the in-cluster postgres. Holds the
# Anchor Platform's Flyway tables + our `nordstern` schema. Serverless v2 scales to a
# low floor for an idle testnet cell; raise min_capacity for production load.
#
# The master password is RDS-managed (manage_master_user_password) so it never lands
# in Terraform state — RDS stores it in a Secrets Manager secret that ESO reads.
module "aurora" {
  source  = "terraform-aws-modules/rds-aurora/aws"
  version = "~> 9.10"

  name              = "${local.name}-anchordb"
  engine            = "aurora-postgresql"
  engine_mode       = "provisioned"
  engine_version    = "15.4"
  database_name     = "anchordb"
  master_username   = "anchor"
  manage_master_user_password = true

  vpc_id               = module.vpc.vpc_id
  db_subnet_group_name = module.vpc.database_subnet_group_name

  # Only the EKS nodes may reach the DB.
  security_group_rules = {
    app_ingress = {
      source_security_group_id = module.eks.node_security_group_id
    }
  }

  serverlessv2_scaling_configuration = {
    min_capacity = 0.5
    max_capacity = 4
  }
  instance_class = "db.serverless"
  instances      = { one = {} }

  storage_encrypted   = true
  apply_immediately   = true
  skip_final_snapshot = var.env == "dev"
}
