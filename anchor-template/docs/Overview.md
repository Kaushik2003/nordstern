# Project Overview

> **Context:** This is the single source of truth for the NordStern `anchor-template` project.

## What is NordStern?

**NordStern is Anchor Infrastructure as a Service.**

It allows businesses in India to become compliant Stellar anchors without having to build the highly complex technical, KYC, banking, and operations stack themselves.

A Stellar *Anchor* is the on/off-ramp between fiat (INR) and the Stellar blockchain network. An anchor's job is to:
1. Take fiat deposits and send equivalent crypto tokens (1:1 backed) to a user's wallet.
2. Receive crypto tokens from a user and redeem them by wiring fiat back to their bank account.

Doing this well means running SEP (Stellar Ecosystem Proposal) protocol servers, maintaining KYC/AML integrations, wiring into banking/UPI rails, managing a treasury, and building compliance workflows. This is expensive and repetitive to rebuild for every single anchor.

**NordStern runs and manages that stack on behalf of anchors.**
The pitch to a B2B customer is roughly: *"Bring your liquidity, your bank relationship, and your regulatory standing. We provide the SEP servers, KYC integration, payment rails, and the operator console. You collect the spread/fees."*

## The Problem it Solves
Building a robust anchor takes months of engineering effort. The official Stellar Anchor Platform exists, but it requires deep Java expertise and leaves the most complex parts—the "business logic" like banking integrations, UI, and KYC—up to the developer. NordStern provides a "business in a box" wrapper around the official platform.

## Why Stellar & Anchors?
- **Stellar** is uniquely designed for cross-border payments and tokenized real-world assets. It is fast, cheap, and built for compliance.
- **Anchors** form the critical bridge connecting traditional finance (TradFi) to the blockchain. Without anchors, the blockchain is an isolated island.

## Implementation Strategy: The Big Decision

> [!WARNING]
> **We are NOT building an Anchor from scratch.**

Reimplementing the complex SEP-1, SEP-10, SEP-12, and SEP-24 protocols from scratch is a massive liability.

Instead, our core implementation strategy is:
1. **Clone the Official Platform:** We use the official, battle-tested `stellar/anchor-platform` Java Docker image to handle all strict protocol compliance.
2. **Build a Business Server:** We build a custom Node.js `business-server` that hooks into the official platform's callbacks. This server contains *only* our custom business logic (UPI, Razorpay, KYC, UI).
3. **Establish a Template:** We are building *one* production-quality Anchor (`anchor-template`) that will later become the exact template for all future multi-tenant Anchors hosted on NordStern.
