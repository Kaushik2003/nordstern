# Mainnet USDC On-Ramp — Pre-Demo Sanity Checklist

This checklist must be 100% green before initiating the live demo. It ensures all components are healthy, credentials are live, and liquidity is verified on-chain.

---

## 1. Infrastructure & Environment Health

- [ ] **Platform control plane is running**: The main control-plane service is up and healthy.
- [ ] **Anchor Platform (AP) is running**: The AP container is active, and the Platform API endpoints are reachable.
- [ ] **Business Server is running**: The business-server container is active with no exit codes.
- [ ] **No Mainnet Boot Guard failures**: The business-server log shows:
  `[boot-guard] mainnet production config validated `
  (If the boot guard failed, the container will have exited immediately — check `docker logs`).
- [ ] **ACME/TLS Certificates are active**: Checking `https://<slug>.nordstern.live/.well-known/stellar.toml` resolves successfully over HTTPS with a valid SSL/TLS certificate.

---

## 2. On-Chain Treasury Readiness

- [ ] **Treasury account exists**: horizon query confirms the G... public key is active.
- [ ] **USDC Trustline is present**: The treasury account has an active trustline to Circle's mainnet issuer `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`.
- [ ] **Minimum XLM reserve is met**: Account balance holds $\ge 5$ XLM (to prevent reserve locking).
- [ ] **USDC Float is active**: USDC balance is $> 0$ (recommend $50$ USDC for demo headroom).
- [ ] **Stellar.expert confirmation**: Inspecting the treasury account on the public explorer matches all of the above.

---

## 3. KYC Integration (DIDIT)

- [ ] **DIDIT API Key is verified**: Workflow session requests return a valid SDK redirect URL.
- [ ] **KYC workflow executes**: Completing a DIDIT flow session successfully updates the user status to `ACCEPTED` and fires the webhook.
- [ ] **Webhook signature matches**: The signature verification passes between DIDIT and the business-server webhook endpoint.

---

## 4. Payment & Interactive Flow (SEP-24 & Razorpay)

- [ ] **SEP-10 Authentication succeeds**: Interactive wallet (e.g. Lobstr, Vibrant, Freighter) authenticates against the SEP-10 endpoint and receives a valid JWT token.
- [ ] **Interactive webview loads**: The SEP-24 interactive URL launches, rendering the KYC and deposit wire screens.
- [ ] **Razorpay Checkout opens**: The Razorpay SDK loads Checkout with a live key identifier (`rzp_live_…`).
- [ ] **Razorpay Live Callback verified**: Making a real INR payment (e.g., ₹100) triggers the `payment.captured` webhook.
- [ ] **Webhook signature verified**: Razorpay webhook signature is validated successfully on the business-server.

---

## 5. Settlement & Fulfillment

- [ ] **Treasury payment succeeds**: The business-server signs and submits the Stellar transaction sending USDC from the treasury to the user's destination wallet.
- [ ] **Idempotent transaction lookup**: The payment tx is submitted with the correct memo, and the network hash is generated.
- [ ] **Anchor Platform transaction PATCHed**: The business-server patches the transaction status to `completed` with the on-chain transfer hash.
- [ ] **USDC arrives in destination wallet**: The user's wallet shows the real USDC balance increase.
- [ ] **Stellar.expert explorer confirmation**: Opening the transaction hash on the explorer shows the successful payment from the treasury to the user.
