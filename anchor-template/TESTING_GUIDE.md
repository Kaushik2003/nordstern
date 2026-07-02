# NordStern Anchor: Running & Testing Guide

This guide explains how to start your local NordStern Anchor stack and test a full end-to-end fiat-to-crypto transaction using the official Stellar Demo Wallet.

## 1. Starting the Services

Your anchor consists of four services running in Docker: `db`, `anchor-platform`, `business-server`, and `client`.

To start them:
1. Open your terminal in the `anchor-template` directory.
2. If this is your very first time, run the setup script to generate your testnet keys and `.env` file:
   ```bash
   node scripts/setup-testnet.mjs
   ```
3. Start the Docker stack in the background:
   ```bash
   docker compose up --build -d
   ```

Once running, your Next.js operator dashboard (the **Client**) will be available at [http://localhost:3011](http://localhost:3011).

## 2. Testing with the Stellar Demo Wallet

To simulate a user depositing fiat to receive USDC (an On-Ramp), follow these exact steps:

### A. Set up a dummy wallet
1. Go to the [Stellar Demo Wallet](https://demo-wallet.stellar.org/).
2. In the top right corner, ensure the network is set to **Testnet**.
3. Click **"Generate keypair for new account (testnet only)"** on the main screen.
4. Once generated, click the blue **"Create account"** link next to the Public Key on the left. This asks Friendbot to fund your new account with 10,000 XLM so you can pay network fees.

### B. Add a Trustline for USDC
Before your anchor can send USDC to this dummy wallet, the wallet must explicitly allow it by creating a "trustline".
1. On the left sidebar, click the purple **"Add asset"** button.
2. A dialog will appear. Enter the following:
   * **ASSET CODE:** `USDC`
   * **ANCHOR HOME DOMAIN:** `localhost:8080` *(This points the wallet to your local Anchor Platform).*
3. The **"Add"** button will turn purple. Click it!
4. The wallet will fetch the asset configuration from your anchor. Next to the newly added USDC asset under your balances, click the **"Select action"** dropdown and choose **"Add trustline"**. Click the button to execute it.

### C. Initiate a SEP-24 Deposit (Fiat to Crypto)
1. In the Demo Wallet, click the dropdown next to your USDC balance and select **"SEP-24 Deposit"**.
2. A popup will appear. Ignore the optional fields and just click **"Start"**.
3. A new browser window will open, showing your custom NordStern Interactive UI (served by your `business-server`).
   * *Note: If the popup opens to port `3000` and shows a Next.js 404 error (because you have the prototype running on that port), manually change `3000` to `3005` in your browser's address bar and hit Enter.*
4. The screen will quote the live INR FX rate and show a default deposit of 10.00 USDC.
5. Click **"Confirm"**.

The interactive window will close, and the wallet will notify you that the deposit is complete! If you check the Demo Wallet, your USDC balance will now show **10.00 USDC**.

## 3. Viewing the Results Locally

Now that you've processed a real testnet transaction, you can see how your local services reacted:

### In the Business Server
Check the logs of your business server by running:
```bash
docker compose logs --tail 50 -f business-server
```
You will see the business server receiving the transaction webhook, calculating the FX rate, verifying the treasury reserves, and executing the Stellar SDK `sendUsdc` command to mint the tokens.

### In the Client Dashboard
Open your local operator console at [http://localhost:3011](http://localhost:3011).
* **Analytics Page:** Your "Total Volume" and "Transactions" metrics will have increased.
* **Treasury Page:** You will see the live USDC balance of your Anchor's treasury account has decreased by 10.00 USDC, and the transaction will be permanently logged in your "Withdrawal & Deposit History" ledger.
* **Users & KYC Page:** The dummy wallet's Stellar address will now appear in your user list as an active user!
