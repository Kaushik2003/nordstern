# NordStern Anchor — Infrastructure (Phase 1)

> **Scope: one *proven* anchor on one EKS "cell".** This is the first infra slice
> from `docs/architecture/Platform.md` — deliberately *not* the full
> multi-tenant platform. It is authored **template-ready** (every anchor-specific
> value is a Helm value / Terraform variable) so the factory can stamp it out later.
> Nothing here runs real money: testnet + sandbox adapters until the go-live gating
> in `docs/GoLive.md` is cleared.

## What this deploys

The same anchor stack you run locally via `docker-compose`, but on managed AWS:

| Local (compose) | Production (this infra) |
|---|---|
| `db` (postgres container) | **RDS Aurora PostgreSQL** |
| `anchor-platform`, `business-server`, `client` | **EKS Deployments** (Helm chart) |
| `.env` secrets | **AWS Secrets Manager** → External Secrets Operator |
| `cloudflared` tunnel | **ALB + ACM/Let's Encrypt TLS** on a real domain |
| built images (dev Dockerfiles) | **ECR** images (`infra/docker/*`, non-root, compiled) |

## Layout

```
infra/
├─ docker/                 # production images (multi-stage, non-root, healthchecked)
│  ├─ business-server.Dockerfile   # tsc → node dist  (verified)
│  └─ client.Dockerfile            # Next.js standalone
├─ terraform/              # AWS foundation (VPC, EKS, Aurora, ECR, IAM/IRSA, Secrets)
├─ helm/anchor-stack/      # the anchor workloads as a parameterized chart
└─ argocd/                 # GitOps app-of-apps (wires addons + the chart)
```

## Tech choices (per the architecture doc)

- **AWS**, region **ap-south-1 (Mumbai)** — India data residency (DPDP Act).
- **EKS** one cell · **Karpenter** for nodes · **Terraform** (community `terraform-aws-modules`).
- **RDS Aurora PostgreSQL** (replaces the in-cluster pg; the `nordstern` schema + AP's
  Flyway tables live here).
- **ECR** (immutable tags, scan-on-push) · **Secrets Manager + External Secrets Operator**.
- **ALB** (AWS Load Balancer Controller) + **cert-manager** + **external-dns**.
- **ArgoCD** GitOps; observability (kube-prometheus-stack / AMP+AMG) follows.

## Prerequisites (what you provide)

1. An **AWS account** + credentials with admin (for the first `terraform apply`).
2. A **domain** (or subdomain) delegated to Route 53 — for the anchor's public SEP
   endpoints + console (e.g. `acme.anchors.nordstern.io`).
3. Tools: `terraform >= 1.6`, `awscli`, `kubectl`, `helm`, `docker`.

## Deploy order (once AWS creds + domain are set)

```bash
# 1. Foundation — VPC, EKS, Aurora, ECR, IAM
cd infra/terraform
terraform init && terraform apply

# 2. Build + push images to ECR
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <acct>.dkr.ecr.ap-south-1.amazonaws.com
docker build -f infra/docker/business-server.Dockerfile -t <ecr>/business-server:<tag> business-server && docker push <ecr>/business-server:<tag>
docker build -f infra/docker/client.Dockerfile         -t <ecr>/client:<tag>         client         && docker push <ecr>/client:<tag>

# 3. Cluster addons + the anchor stack (GitOps or direct helm)
helm upgrade --install anchor-acme infra/helm/anchor-stack -n anchor-acme --create-namespace -f <anchor-values>.yaml
```

## Status

- [x] Production images (`infra/docker/*`) — business-server build **verified** (61 MB, non-root, fail-closed KYC runs).
- [ ] Terraform foundation (VPC / EKS / Aurora / ECR / IAM / Secrets).
- [ ] Helm chart (`anchor-stack`).
- [ ] GitOps + ingress + observability.

**The running local `docker-compose` stack is untouched** — these are additive; local dev/demo still works exactly as before.
