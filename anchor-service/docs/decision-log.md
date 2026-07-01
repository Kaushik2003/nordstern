# Decision Log

## DL-001 — Business Server Language: TypeScript (Node.js)
- **Decision:** TypeScript with Node.js for the Business Server
- **Alternatives:** Kotlin/Spring Boot, Java/Spring Boot
- **Why chosen:** Preference. The Anchor Platform callback API is a plain HTTP contract — any language works.
- **Tradeoffs:** No official TypeScript Anchor SDK. We implement the callback API contract manually using `@stellar/stellar-sdk` for Stellar operations.

## DL-002 — Container Strategy: Docker Compose
- **Decision:** Docker Compose for local orchestration
- **Alternatives:** Kubernetes (k3d/minikube)
- **Why chosen:** Official Anchor Platform approach. Single file, minimal setup friction, easy to reason about service boundaries.
- **Tradeoffs:** Not production-representative. Will need migration to k8s or similar for real deployment.

## DL-003 — Network: Stellar Testnet
- **Decision:** Stellar Testnet
- **Alternatives:** Futurenet
- **Why chosen:** Standard starting point. Free XLM via Friendbot, stable, wallets support it, resets quarterly.
- **Tradeoffs:** Resets every quarter — keypairs and assets are wiped. Never use testnet keys/assets for anything real.

## DL-004 — Asset Code: ANCH
- **Decision:** `ANCH` as the test asset code
- **Alternatives:** USDA, ANCHRUSD, TESTX
- **Why chosen:** Short (4 chars), memorable, clearly identifies this as our anchor's asset.
- **Tradeoffs:** Not a real stablecoin name. In production this would be something like USDC, KESH, etc.
