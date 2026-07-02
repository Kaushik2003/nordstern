# Setup & Testing Guide

> **Context:** This document explains how to set up the development environment, run the stack locally, and test end-to-end transactions.

---

## 1. Prerequisites

- Node.js 20+
- Docker & Docker Compose
- A basic understanding of Stellar concepts (Keypairs, Trustlines, Friendbot).

---

## 2. Environment Setup

The repository relies on a `.env` file that contains your Stellar signing keys, treasury keys, and port configurations. **Do not create this manually.**

1. Open your terminal in the `anchor-template` directory.
2. Run the automated setup script to generate fresh testnet keys and fund them via Friendbot:
   ```bash
   node scripts/setup-testnet.mjs
   ```
3. This creates a `.env` file (which is git-ignored) and populates `config/stellar.toml`.

---

## 3. Running the Stack

To start the entire infrastructure (Database, Anchor Platform, Business Server, and Client Dashboard):

```bash
docker compose up --build -d
```

### Accessing the Services
- **Anchor Platform (SEP Server):** `http://localhost:8080`
- **Business Server:** `http://localhost:3000`
- **Client Dashboard:** `http://localhost:3011` *(Note: Check your `.env` for `CLIENT_HOST_PORT` as it may vary).*

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
4. Click **Confirm** in the UI. 
5. The popup closes, and **10.00 USDC** will appear in your Demo Wallet balance.

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
