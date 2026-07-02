# Open Questions & Compliance

> **Context:** This document tracks unresolved architectural and legal questions. We do not encode legal conclusions in code without explicit sign-off from counsel.

---

## Legal & Compliance Questions

### 1. Who holds the fiat, and under what license?
Do we (NordStern) run a master Nodal/Escrow account on behalf of all anchors, or does each anchor bring their own bank account? 
- *Impact:* This changes who the regulated entity is and how the `business-server` connects to Razorpay/Cashfree.

### 2. VDA / VDASP Classification
Fiat-to-token on/off-ramps are increasingly classified as Virtual Digital Asset Service Providers in India, requiring **FIU-IND registration** (PMLA reporting). 
- *Question:* Which entity registers — NordStern, or the individual anchor tenant?

### 3. Custody Model
Are we ever in custody of customer funds or private keys? Custody triggers much heavier regulatory obligations. 
- *Impact:* The MVP avoids custody entirely. End users hold their own keys in their own wallets (like Vibrant or Lobstr). We must ensure no feature accidentally crosses the line into custodial exchange territory.

### 4. KYC Data Residency & Sharing
Who is the data controller of the KYC data? 
- *Question:* Can we build a "Verify Once, Use Across All Anchors" shared network, or must user data remain strictly siloed per anchor due to consent/retention limits?

---

## Technical Questions

### 1. Multi-Tenancy Segregation
When we build the Control Plane, how do we segregate the Anchor Platform? 
- *Option A:* Run one massive instance of `anchor-platform` and use tenant IDs. (The AP currently struggles with this).
- *Option B:* The Control Plane dynamically spins up a new isolated `anchor-platform` Docker container (and DB schema) for every new customer. (More expensive, but safer).

### 2. Banking Abstraction
How do we handle the fact that some anchors will want to use Cashfree, some will use Razorpay, and some will want to do manual wire transfers?
- *Current Approach:* We use the `PayoutProvider` interface. Is this abstraction robust enough for a multi-tenant environment where the UI needs to dynamically change based on the provider?
