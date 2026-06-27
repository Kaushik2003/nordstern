# Glossary

## Anchor
A business or entity that bridges real-world assets (fiat, commodities) to Stellar tokens. Holds fiat in custody off-chain and issues equivalent tokens on Stellar. Honors redemptions.

## Asset (Stellar)
A token on Stellar identified by two things: an asset code (e.g. `ANCH`) and an issuer public key. Two assets with the same code but different issuers are completely different assets.

## Asset Code
1–12 character identifier for a token (e.g. `ANCH`, `USDC`, `XLM`). XLM is the only native asset with no issuer.

## BASE_FEE
Minimum transaction fee on Stellar, denominated in stroops. 1 XLM = 10,000,000 stroops. BASE_FEE = 100 stroops = 0.00001 XLM.

## Distribution Account
The anchor's operational Stellar account. Holds token inventory. Sends tokens to users on deposit, receives tokens from users on withdrawal. Hot wallet in production.

## Friendbot
A Testnet-only faucet that funds a Stellar account with free XLM. Not available on Mainnet.

## Horizon
Stellar's REST API server. Provides access to account balances, transaction history, order book, and lets you submit transactions. Operated by the Stellar Development Foundation and various third parties.

## Issuer Account
The Stellar account whose keypair defines a custom asset. Sending from the issuer creates (mints) tokens. Receiving back to the issuer destroys (burns) them. Sacred — kept in cold storage in production.

## Keypair
A cryptographic key pair: a public key (address, shareable) and a secret key (private key, never share). Stellar uses Ed25519.

## KYC (Know Your Customer)
Identity verification process. Anchors collect KYC to comply with financial regulations and know who they are sending/receiving money for.

## Ledger
A single block of confirmed transactions on Stellar. A new ledger is created roughly every 5 seconds.

## Memo
An optional field on Stellar payments. Anchors use memos to identify which customer a payment belongs to, since many users send to the same distribution account address.

## Network Passphrase
A string that uniquely identifies a Stellar network. Used when signing transactions to prevent replay attacks across networks.
- Testnet: `Test SDF Network ; September 2015`
- Mainnet: `Public Global Stellar Network ; September 2015`

## Observer
A component of the Anchor Platform that watches the Stellar ledger for incoming and outgoing payments to the anchor's accounts.

## SEP (Stellar Ecosystem Proposal)
Standardized protocol specifications that enable interoperability between Stellar applications. Equivalent to BIPs in Bitcoin or EIPs in Ethereum.

## Signing Account
A separate keypair used only for SEP-10 authentication challenges. Kept separate from funds for security isolation.

## Stroop
The smallest unit of XLM. 1 XLM = 10,000,000 stroops.

## Trustline
An explicit opt-in a Stellar account must make before it can hold a non-native asset. The account declares it trusts a specific issuer for a specific asset up to a specified limit.

## XLM
Stellar's native currency (Lumens). Used to pay transaction fees and maintain minimum account balances. No issuer — created at network genesis.
