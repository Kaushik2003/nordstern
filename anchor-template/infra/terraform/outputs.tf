output "region" {
  value = var.region
}

output "cluster_name" {
  value = module.eks.cluster_name
}

output "cluster_endpoint" {
  value = module.eks.cluster_endpoint
}

output "configure_kubectl" {
  description = "Run this to talk to the cell."
  value       = "aws eks update-kubeconfig --region ${var.region} --name ${module.eks.cluster_name}"
}

output "aurora_endpoint" {
  value = module.aurora.cluster_endpoint
}

output "aurora_master_secret_arn" {
  description = "RDS-managed master credentials (ESO reads this to build DATABASE_URL)."
  value       = module.aurora.cluster_master_user_secret[0].secret_arn
}

output "ecr_repos" {
  value = { for k, r in aws_ecr_repository.this : k => r.repository_url }
}

output "anchor_secret_arns" {
  value = { for k, s in aws_secretsmanager_secret.anchor : k => s.arn }
}

output "external_secrets_policy_arn" {
  value = aws_iam_policy.external_secrets.arn
}

output "external_secrets_role_arn" {
  description = "IAM Role ARN for the External Secrets Operator IRSA"
  value       = aws_iam_role.external_secrets.arn
}
