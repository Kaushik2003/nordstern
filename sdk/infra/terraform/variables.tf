variable "region" {
  description = "AWS region. ap-south-1 (Mumbai) for India data residency."
  type        = string
  default     = "ap-south-1"
}

variable "project" {
  type    = string
  default = "nordstern"
}

variable "env" {
  description = "Cell environment. 'dev' = testnet cell (cost-optimized: single NAT, small nodes)."
  type        = string
  default     = "dev"
}

variable "vpc_cidr" {
  type    = string
  default = "10.60.0.0/16"
}

variable "cluster_version" {
  type    = string
  default = "1.30"
}

variable "domain" {
  description = "Base domain (Route 53) for anchor endpoints + console, e.g. anchors.nordstern.io. Used by external-dns/cert-manager (Task #11)."
  type        = string
  default     = ""
}

variable "anchor_slugs" {
  description = "Anchors to pre-provision (namespace + per-anchor secret) in this cell."
  type        = list(string)
  default     = ["acme"]
}
