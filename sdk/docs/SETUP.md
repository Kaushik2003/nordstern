# Setup & Testing Guide

> **Context:** This document explains how to set up the development environment, run the stack locally, and test end-to-end transactions.

---

## 1. Prerequisites

- Node.js 20+
- Docker & Docker Compose
- A basic understanding of Stellar concepts (Keypairs, Trustlines, Friendbot).
- **KYC is real by default (`KYC_PROVIDER=didit`) and fails closed** — the stack will not
  start without a real KYC provider configured. You need an [ngrok](https://ngrok.com)
  account with a **reserved static domain** and an authtoken; the Dockerized `ngrok`
  service exposes the business-server publicly so DIDIT can deliver its verification
  webhook. *(For local dev without DIDIT you may set `KYC_PROVIDER=mock ALLOW_MOCK_KYC=true`
  to skip ngrok — this auto-approves every user, is dev-only, and is refused on mainnet.)*

---

## 2. Environment Setup

The repository relies on a `.env` file that contains your Stellar signing keys, treasury keys, and port configurations. **Do not create this manually.**

1. Open your terminal in the `anchor-template` directory.
2. Run the automated setup script to generate fresh testnet keys and fund them via Friendbot:
   ```bash
   node scripts/setup-testnet.mjs
   ```
3. This creates a `.env` file (which is git-ignored) and populates `config/stellar.toml`.

### DIDIT KYC (required by default — `KYC_PROVIDER=didit`)

> Real KYC is the default and the server refuses to boot without it. For a local smoke
> run without DIDIT, set `KYC_PROVIDER=mock ALLOW_MOCK_KYC=true` in `.env` (dev-only;
> auto-approves everyone; forbidden on mainnet) — otherwise the deposit/withdraw gate
> will (correctly) block until identity is verified.

The Dockerized `ngrok` service gives DIDIT a public HTTPS URL to reach the business-server.
In `.env`:

- Set `NGROK_AUTHTOKEN` to your ngrok authtoken.
- `PUBLIC_BASE_URL` must be your **reserved static** ngrok domain (e.g.
  `https://your-name.ngrok-free.dev`). The `ngrok` service binds exactly this URL, so it —
  and the DIDIT webhook registration — stay stable across restarts.
- **Stop any host `ngrok` first** (`pkill ngrok`): a reserved domain allows one agent, so a
  host process and the container can't both claim it.

---

## 3. Running the Stack

To start the entire infrastructure (Database, Anchor Platform, Business Server, Client
Dashboard, and the ngrok tunnel):

```bash
docker compose up --build -d
```

> `PUBLIC_BASE_URL` is read when the business-server container is **created**. If you edit
> it later, recreate the container (`docker compose up -d --build`) — otherwise a stale value
> leaks into the DIDIT redirect (you'll see the hosted flow redirect to the old host).

### Accessing the Services
- **Anchor Platform (SEP Server):** `http://localhost:8080`
- **Business Server:** `http://localhost:3000`
- **Client Dashboard:** `http://localhost:3001` *(Note: Check your `.env` for `CLIENT_HOST_PORT` as it may vary).*
- **ngrok inspector:** `http://localhost:4040` — see live tunnel status and inbound webhooks.

---

## 4. End-to-End Testing (Stellar Demo Wallet)

To simulate a real user depositing fiat for USDC, use the official Stellar test tool.

### Step 1: Create a Dummy Wallet
1. Go to the [Stellar Demo Wallet](https://demo-wallet.stellar.org/).
2. Set network to **Testnet** (top right).
3. Click **"Generate keypair for new account"**.
4. Click the blue **"Create account"** link to fund it with test XLM.

### Step 2: Add the USDC Trustline
1. Click **"Add asset"** (purple button on the left).
2. Enter **ASSET CODE:** `USDC` and **ANCHOR HOME DOMAIN:** `localhost:8080`.
3. Click **Add**.
4. In the dropdown next to the new USDC asset, select **"Add trustline"** and execute it.

### Step 3: Execute a SEP-24 Deposit
1. In the Demo Wallet, click the dropdown next to USDC and select **"SEP-24 Deposit"**.
2. Click **Start**.
3. A popup opens your custom interactive UI. *(Note: If the popup opens to port 3000 and 404s due to a port collision, manually change it to 3005 or your configured `BIZ_HOST_PORT` in the URL bar).*
4. **Identity verification (if `KYC_PROVIDER=didit`):** the popup first shows a KYC gate.
   Click **Verify my identity**; the DIDIT hosted flow opens (on desktop you scan a QR and
   finish on your **phone**). When DIDIT's webhook reaches the business-server, the popup —
   which polls `/sep24/kyc/status` every 3s — advances automatically to the deposit screen.
   You do **not** need the phone's redirect to return to the laptop. *(With `KYC_PROVIDER=mock`
   the gate is skipped.)*
5. Click **Confirm** in the UI.
6. The popup closes, and **10.00 USDC** will appear in your Demo Wallet balance.

---

## 5. Troubleshooting

- **Error: "amount argument must be of type String"** 
  - *Cause:* The wallet did not provide an amount, resulting in a `'0'` value being passed to the Stellar SDK. 
  - *Fix:* Ensure the fallback logic in `sep24.ts` is active (defaulting to `'10.00'`).
- **Error: "transaction is in state 'error'"**
  - *Cause:* You tried to retry a transaction that previously failed (e.g. missing trustline). The system locks it to prevent double-spends.
  - *Fix:* Start a brand new transaction in the Demo Wallet.
- **Port Conflicts:**
  - If `3000` or `5432` are in use, modify `BIZ_HOST_PORT` and `DB_HOST_PORT` in your `.env` file and rebuild the containers.
- **KYC popup never advances / "verification not working":**
  - *Cause:* DIDIT's webhook can't reach the business-server. Check the `ngrok` container is
    up and `http://localhost:4040` shows a tunnel on your `PUBLIC_BASE_URL` domain; confirm
    the DIDIT dashboard webhook points at that same domain.
  - *Also:* the KYC `ACCEPTED` record expires after `KYC_REVERIFY_TTL_SECONDS` (default 300 =
    5 min — too short for a cross-device test). Raise it in `.env` (e.g. `86400`) and recreate.
- **Phone redirects to `localhost:3000` after verifying (dead page):**
  - *Cause:* DIDIT's post-verification redirect is cosmetic and points at the business-server's
    `PUBLIC_BASE_URL`; on the phone `localhost` is the phone itself. It is **not** how the flow
    completes — the webhook + the desktop popup's 3s poll are. Just return to the laptop.
  - If the redirect shows an old/`localhost` host, the container has a stale `PUBLIC_BASE_URL`
    (captured at create time). Recreate: `docker compose up -d --build`.
- **`ngrok` container exits / can't bind domain:**
  - *Cause:* a host `ngrok` process already holds the reserved domain. `pkill ngrok`, then
    `docker compose up -d ngrok`.
