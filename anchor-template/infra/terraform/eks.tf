# EKS "cell". A small managed node group runs system pods + (later) Karpenter, which
# then provisions tenant workload nodes just-in-time. Cluster addons for ALB, ESO,
# cert-manager, external-dns, Karpenter are installed in Task #11 (GitOps/Helm).
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 20.24"

  cluster_name    = local.name
  cluster_version = var.cluster_version

  # Public endpoint for bootstrap convenience — restrict to your IPs (or go private)
  # before this cell holds anything real (see docs/GO_LIVE_GATING.md §2).
  cluster_endpoint_public_access           = true
  enable_cluster_creator_admin_permissions = true

  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets

  eks_managed_node_groups = {
    system = {
      instance_types = ["t3.large"]
      min_size       = 2
      max_size       = 4
      desired_size   = 2
      labels         = { role = "system" }
    }
  }

  cluster_addons = {
    coredns            = {}
    kube-proxy         = {}
    vpc-cni            = {}
    aws-ebs-csi-driver = {}
  }

  # Discovery tag so Karpenter finds this cluster's resources.
  tags = { "karpenter.sh/discovery" = local.name }
}
