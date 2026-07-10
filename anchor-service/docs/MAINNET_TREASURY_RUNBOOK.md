# Mainnet USDC Treasury — Funding & Setup Runbook

> **Audience:** the Stellar team funding the account + the NordStern operator running
> the demo anchor. **Not** a developer document.
>
> **Goal:** stand up ONE mainnet treasury account that holds a real **Circle USDC**
> float, so the anchor can transfer real USDC to customers after a real INR payment.
> The anchor is a **liquidity provider, not an issuer** — it never mints anything. It
> only moves USDC it already holds.

---

## 0. The fixed facts (do not substitute)

| Thing | Value |
|-------|-------|
| Network | **Stellar Public (mainnet)** |
| Network passphrase | `Public Global Stellar Network ; September 2015` |
| Horizon | `https://horizon.stellar.org` |
| Asset | **USDC** |
| **Circle USDC issuer (mainnet)** | `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` |

The issuer above is Circle's official mainnet USDC issuer (verified against Circle's
developer docs). **The treasury must trust THIS exact issuer** — many same-named
"USDC" assets exist under other issuers and are worthless. Copy it character-for-character.

---

## 1. Who does what (ordering matters)

The account cannot hold USDC until (a) it exists on-chain (funded with XLM) and
(b) it has a USDC trustline. So the two teams interleave:

| Step | Owner | Action |
|------|-------|--------|
| 1 | **NordStern** | Generate the treasury keypair. Share only the **public key** (starts with `G`). Keep the secret (`S…`) secret. |
| 2 | **Stellar team** | Send **≥ 5 XLM** to the treasury public key (this creates + funds the account). |
| 3 | **NordStern** | Create the **USDC trustline** on the treasury (needs the secret; XLM must already be there). |
| 4 | **Stellar team** | Send the **USDC float** (e.g. **50 USDC**) to the treasury public key. |
| 5 | **Both** | Run the verification checks in §5. All must pass before launch. |

> Do **not** send USDC before step 3. A payment to an account without a USDC
> trustline **fails** and bounces. XLM first → trustline → then USDC.

---

## 2. Step 1 — Generate the treasury keypair (NordStern)

Any one of these produces a fresh keypair. Do it on a trusted machine.

**Option A — Stellar CLI**
```bash
stellar keys generate treasury --network mainnet
stellar keys address treasury   # prints the G… public key to share
# The secret is stored by the CLI; export it for the anchor env when needed:
stellar keys show treasury       # prints the S… secret — handle securely
```

**Option B — Node (repo already has @stellar/stellar-sdk)**
```bash
node -e "const {Keypair}=require('@stellar/stellar-sdk');const k=Keypair.random();console.log('PUBLIC (share):',k.publicKey());console.log('SECRET (keep):',k.secret());"
```

- **Share with the Stellar team:** the `G…` public key only.
- **Keep secret:** the `S…` secret — it goes into the anchor's `TREASURY_SECRET`
  env at launch and nowhere else. Never paste it in chat/email/tickets.

---

## 3. Step 2 — Fund XLM (Stellar team)

Send **5 XLM** to the treasury public key.

**Why 5:** Stellar requires a minimum balance that grows with account "subentries."

- Base reserve = **0.5 XLM** per entry.
- Minimum balance = `(2 + subentries) × 0.5 XLM`.
- The treasury needs **one** subentry (the USDC trustline) → minimum `(2 + 1) × 0.5 = 1.5 XLM` locked.
- Transaction fees are negligible (~0.00001 XLM each).

So **1.5 XLM is the hard floor; 5 XLM gives comfortable headroom** for the trustline
reserve, fees, and margin. (The anchor's boot check requires at least `MIN_TREASURY_XLM`,
default **5**.)

---

## 4. Step 3 — Create the USDC trustline (NordStern)

The treasury must explicitly trust Circle's USDC before it can receive any. Run this
once, after XLM has landed (confirm with §5.1 first).

**Node snippet** (uses the treasury secret; run on a trusted machine):
```bash
node <<'EOF'
const { Horizon, Keypair, TransactionBuilder, Operation, Asset, BASE_FEE, Networks } =
  require('@stellar/stellar-sdk');

const SECRET   = process.env.TREASURY_SECRET;          // export TREASURY_SECRET=S...
const ISSUER   = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const server   = new Horizon.Server('https://horizon.stellar.org');
const kp       = Keypair.fromSecret(SECRET);
const usdc     = new Asset('USDC', ISSUER);

(async () => {
  const acct = await server.loadAccount(kp.publicKey());
  const tx = new TransactionBuilder(acct, { fee: BASE_FEE, networkPassphrase: Networks.PUBLIC })
    .addOperation(Operation.changeTrust({ asset: usdc }))   // no limit = max
    .setTimeout(60).build();
  tx.sign(kp);
  const res = await server.submitTransaction(tx);
  console.log('trustline created:', res.hash);
})().catch(e => { console.error('FAILED:', e.response?.data?.extras?.result_codes ?? e.message); process.exit(1); });
EOF
```

Expected: prints `trustline created: <hash>`. If it fails with `op_low_reserve`, the
account doesn't have enough XLM — send more (§3).

---

## 5. Step 5 — Verification (both teams, before launch)

All commands are read-only `curl` against public mainnet Horizon. No auth needed.
Replace `$TREASURY` with the treasury public key.

### 5.1 Account exists and holds XLM
```bash
curl -s "https://horizon.stellar.org/accounts/$TREASURY" | \
  python3 -c "import sys,json;d=json.load(sys.stdin);print('XLM:',[b['balance'] for b in d['balances'] if b['asset_type']=='native'][0])"
```
✅ Prints an XLM balance ≥ 5. (A `404` means the account isn't funded yet — step 2 not done.)

### 5.2 USDC trustline exists
```bash
curl -s "https://horizon.stellar.org/accounts/$TREASURY" | \
  python3 -c "import sys,json;d=json.load(sys.stdin);print([b for b in d['balances'] if b.get('asset_code')=='USDC' and b.get('asset_issuer')=='GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'] or 'NO USDC TRUSTLINE')"
```
✅ Prints a USDC balance line (balance may be `0.0000000` before step 4).
❌ `NO USDC TRUSTLINE` → step 3 not done (or trusts the wrong issuer).

### 5.3 USDC float has arrived
```bash
curl -s "https://horizon.stellar.org/accounts/$TREASURY" | \
  python3 -c "import sys,json;d=json.load(sys.stdin);print('USDC:',[b['balance'] for b in d['balances'] if b.get('asset_code')=='USDC' and b.get('asset_issuer')=='GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'][0])"
```
✅ Prints a USDC balance > 0 (e.g. `50.0000000`).

### 5.4 Explorer sanity check
Open `https://stellar.expert/explorer/public/account/$TREASURY` and confirm:
- The account exists.
- It has a **USDC** trustline to `GA5Z…KZVN`.
- Its USDC balance matches what was sent.

---

## 6. How much USDC to send

- Each **₹100** deposit releases roughly **~1.1–1.2 USDC** at current INR/USD rates.
- For the demo (a couple of ₹100 runs from two wallets + margin), send **50 USDC**.
  This comfortably covers repeat tests without a top-up.

---

## 7. Pre-launch sanity checklist (all must be ✅)

- [ ] Treasury public key shared with NordStern; secret held only by NordStern.
- [ ] §5.1 — account exists, XLM ≥ 5.
- [ ] §5.2 — USDC trustline present, to issuer `GA5Z…KZVN` (not any other).
- [ ] §5.3 — USDC balance > 0 (≈ 50).
- [ ] §5.4 — stellar.expert shows all of the above.
- [ ] NordStern has `TREASURY_PUBLIC` + `TREASURY_SECRET` ready for the anchor env.

When every box is checked, the anchor can be provisioned and the demo can run.

---

## 8. Safety notes

- **The secret never leaves NordStern.** Stellar funds a public key; NordStern signs.
- **Never mint.** This account only *moves* USDC Circle already issued. There is no
  issuer key and no minting in this model — by design.
- **Small float.** Keep the demo float small (≈ 50 USDC). It's real money on mainnet.
- **One trustline only.** The only subentry the treasury needs is the USDC trustline.
