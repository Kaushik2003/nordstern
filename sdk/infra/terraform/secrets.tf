# Per-anchor secret (Model A / DEC Q1): holds THAT anchor's own rails — treasury
# signing seed, Razorpay/Cashfree keys, DIDIT keys, etc. Created empty here; the
# actual values are written out-of-band (console/provisioning), never in TF state.
# External Secrets Operator (installed in Task #11) syncs each into its namespace.
resource "aws_secretsmanager_secret" "anchor" {
  for_each = toset(var.anchor_slugs)
  name     = "${var.project}/${var.env}/anchor/${each.value}"
  tags     = { anchor = each.value }
}

# IAM policy scoping External Secrets Operator to exactly these secrets + the
# RDS-managed DB secret. Attached to the ESO IRSA role when the addon is installed.
data "aws_iam_policy_document" "external_secrets" {
  statement {
    sid    = "ReadAnchorSecrets"
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret",
    ]
    resources = concat(
      [for s in aws_secretsmanager_secret.anchor : s.arn],
      [module.aurora.cluster_master_user_secret[0].secret_arn],
    )
  }
}

resource "aws_iam_policy" "external_secrets" {
  name   = "${local.name}-external-secrets"
  policy = data.aws_iam_policy_document.external_secrets.json
}

resource "aws_iam_role" "external_secrets" {
  name = "${local.name}-external-secrets"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = module.eks.oidc_provider_arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            "${module.eks.oidc_provider}:sub" = "system:serviceaccount:external-secrets:external-secrets"
          }
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "external_secrets" {
  role       = aws_iam_role.external_secrets.name
  policy_arn = aws_iam_policy.external_secrets.arn
}
