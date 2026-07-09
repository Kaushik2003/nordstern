# ─── Root variables ──────────────────────────────────────────────────────────
# Sensible pilot defaults; override in terraform.tfvars. Only `resend_api_key` has
# no default (it's a real external secret you must supply).

variable "aws_region" {
  description = "AWS region. Co-locate with the Resend/Supabase region for low latency; ap-northeast-1 (Tokyo) is the pilot default."
  type        = string
  default     = "ap-northeast-1"
}

variable "project" {
  description = "Short project slug — prefixes resource names and secret paths."
  type        = string
  default     = "nordstern"
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "pilot"
}

# ── Networking ──
variable "vpc_cidr" {
  description = "CIDR block for the pilot VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "az_count" {
  description = "Number of AZs to spread subnets across. RDS needs >= 2."
  type        = number
  default     = 2
}

variable "allowed_web_cidrs" {
  description = "CIDRs allowed to reach 80/443 (the public web + SEP endpoints)."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "enable_ssh" {
  description = "Open port 22. Prefer false — the instance profile grants SSM Session Manager access with no inbound SSH."
  type        = bool
  default     = false
}

variable "allowed_ssh_cidrs" {
  description = "CIDRs allowed to SSH when enable_ssh = true. Never leave this as 0.0.0.0/0."
  type        = list(string)
  default     = []
}

# ── Compute ──
variable "ec2_instance_type" {
  description = "EC2 type. Anchor Platform JVMs are RAM-heavy: t3.large (8 GB) floor, t3.xlarge (16 GB) if running several anchors."
  type        = string
  default     = "t3.large"
}

variable "ec2_ami_id" {
  description = "AMI to use. Empty = latest Amazon Linux 2023 (x86_64) looked up automatically."
  type        = string
  default     = ""
}

variable "ec2_key_name" {
  description = "Existing EC2 key pair name for SSH. Empty = no key (SSM only)."
  type        = string
  default     = ""
}

variable "ec2_root_volume_gb" {
  description = "Root EBS volume size (GB). Holds Docker images + per-anchor configs + logs."
  type        = number
  default     = 60
}

# ── Database (RDS Postgres) ──
variable "db_instance_class" {
  description = "RDS instance class."
  type        = string
  default     = "db.t3.small"
}

variable "db_allocated_storage" {
  description = "Initial RDS storage (GB)."
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Storage autoscaling ceiling (GB). 0 disables autoscaling."
  type        = number
  default     = 100
}

variable "db_engine_version" {
  description = "Postgres major.minor. Matches the local pg15."
  type        = string
  default     = "15.16"
}

variable "db_name" {
  description = "Initial database created by RDS. The other platform DBs (platformdb/controldb/aggregatordb) are created post-apply — see README."
  type        = string
  default     = "anchordb"
}

variable "db_username" {
  description = "RDS master username. Needs CREATEDB so the control-plane can create per-anchor databases."
  type        = string
  default     = "nordstern_admin"
}

variable "db_backup_retention_days" {
  description = "Automated backup retention in days. > 0 enables automated backups AND point-in-time recovery (PITR)."
  type        = number
  default     = 7
}

variable "db_multi_az" {
  description = "Multi-AZ RDS. false for the pilot (single-AZ is fine for a testnet pilot; flip to true for real HA)."
  type        = bool
  default     = false
}

variable "db_deletion_protection" {
  description = "Block accidental RDS deletion. false eases pilot teardown; set true for anything you care about."
  type        = bool
  default     = false
}

variable "db_skip_final_snapshot" {
  description = "Skip the final snapshot on destroy. true for a disposable pilot; false to keep a snapshot."
  type        = bool
  default     = true
}

# ── Secrets ──
variable "secrets_prefix" {
  description = "SecretStore prefix. MUST match the app's SECRETS_PREFIX so IAM scopes line up (per-anchor PSP secrets live at <prefix>/<env>/anchor/<slug>)."
  type        = string
  default     = "nordstern"
}

variable "secrets_env" {
  description = "SecretStore environment segment. MUST match the app's SECRETS_ENV."
  type        = string
  default     = "testnet"
}

variable "resend_api_key" {
  description = "Resend API key for transactional email. The one real external secret with no default."
  type        = string
  sensitive   = true
}

variable "email_from" {
  description = "From address for email — must be a Resend-verified domain."
  type        = string
  default     = "NordStern <noreply@nordstern.live>"
}

variable "admin_username" {
  description = "Internal admin-panel username stored in Secrets Manager (never admin/admin in prod)."
  type        = string
  default     = "nordstern-ops"
}

# ── Observability ──
variable "log_retention_days" {
  description = "CloudWatch log retention (days)."
  type        = number
  default     = 30
}

# ── DNS (optional) ──
variable "domain_name" {
  description = "Apex domain for the pilot."
  type        = string
  default     = "nordstern.live"
}

variable "manage_dns" {
  description = "If true, create Route53 records (wildcard + apex → the Elastic IP). If your DNS is on Cloudflare/registrar, leave false and add the wildcard A record manually — see README."
  type        = bool
  default     = false
}

variable "route53_zone_id" {
  description = "Existing Route53 hosted zone id for domain_name. Required when manage_dns = true and create_route53_zone = false."
  type        = string
  default     = ""
}

variable "create_route53_zone" {
  description = "Create the Route53 hosted zone (only if you are moving DNS to Route53). Usually false — you keep an existing zone."
  type        = bool
  default     = false
}
