# docs/ — Index

A word on paths: several file and folder names below contain spaces, parentheses,
apostrophes, and typos (`COnfiguration.md`, `Gettin_Started.md`, `Delivery_Gurantees.md`,
etc). These are copied **verbatim** from disk. Do not "correct" them when building a
path — the corrected form will not exist. Quote any path containing spaces when using
shell tools, e.g. `"SEP_GUIDE/Hosted Deposits and Withdrawals (SEP-24)/Integration.md"`.

This folder is a documentation snapshot for the **Stellar Anchor Platform** (an
on/off-ramp service for the Stellar network), clipped from
`developers.stellar.org` (see each file's frontmatter `source:` field), plus the
full raw **Stellar Ecosystem Proposal (SEP)** specs it implements. There are two
altitudes of content here:

- **Practical/operational docs** (`Admin_Guide/`, `API_References/`, `SEP_GUIDE/`,
  `Product_Overview.md`) — task-oriented guides for running and integrating with
  the Anchor Platform.
- **Protocol specs** (`ecosystem/`) — the underlying standards (SEP-1, SEP-6,
  SEP-10, SEP-24, SEP-31, SEP-38, SEP-45, etc.) that the guides above implement.
  Read the guide first for "how do I do X", drop down to the spec for exact
  wire-format/field-level ground truth.

If you're navigating this folder and don't see what you need indexed below, grep
the folder directly — file titles and one-line descriptions live in each file's
YAML frontmatter (`title:`, `description:`), e.g.:
`grep -rl "SEP-24" --include=*.md .`

## Task-based quick navigation

| Goal | Read in this order |
| --- | --- |
| Understand what the Anchor Platform is / does | `Product_Overview.md` → `Admin_Guide/Architecture.md` |
| Stand up a local test instance | `Admin_Guide/Getting_Started.md` |
| Implement SEP-1 (`stellar.toml` discovery) | `SEP_GUIDE/Stellar Info File (SEP-1).md` |
| Implement SEP-10 (classic/muxed account auth) | `SEP_GUIDE/Stellar Authentication (SEP-10) _ Stellar Docs.md` |
| Implement SEP-45 (contract/smart-wallet account auth) | `SEP_GUIDE/Stellar Authentication for Contract Accounts (SEP-45).md` |
| Implement SEP-6 (programmatic deposit/withdraw) | `SEP_GUIDE/Programmatic Deposits and Withdrawals (SEP-6)/Getting Started _ Stellar Docs.md` → `.../Configuration.md` → `.../Integration.md` |
| Implement SEP-24 (hosted/interactive deposit/withdraw) | `SEP_GUIDE/Hosted Deposits and Withdrawals (SEP-24)/Gettin_Started.md` → `.../Configuration.md` → `.../Integration.md` → `.../Example.md` → `.../FAQ.md` → `.../Set_Up_A_Production_Server.md` |
| Implement SEP-31 (cross-border/receive-only payments) | `SEP_GUIDE/Cross-Border Payments (SEP-31)/COnfiguration.md` → `.../Integration.md` (`Getting_Started.md` is a stub, see gotchas) |
| Build the business/callback server (KYC, rates, events) | `API_References/Callbacks_Server/*.md` |
| Build/consume the internal Platform Server API (transaction state) | `API_References/Platform_Server/Transactions/*.md`, `API_References/Platform_Server/JSON_RPC_API/Overview.md`, `.../Method_Docs_Links.txt` |
| Wire up webhooks / event delivery | `Admin_Guide/Event_Handling/Getting_Started.md` (`Integration.md` and `Delivery_Gurantees.md` are empty, see gotchas) |
| Get the authoritative protocol spec for SEP-N | `ecosystem/README.md` (index) → `ecosystem/sep-00NN.md` |

## Full file tree

```text
docs/
├── index.md                                   (this file)
├── Product_Overview.md
├── Admin_Guide/
│   ├── Architecture.md
│   ├── Assets_and_wallet_clients.md             mislabeled, see gotchas
│   ├── Getting_Started.md
│   └── Event_Handling/
│       ├── Getting_Started.md
│       ├── Integration.md                       empty
│       └── Delivery_Gurantees.md                 empty
├── API_References/
│   ├── Callbacks_Server/
│   │   ├── Create_or_Update_Customer's_Info.md
│   │   ├── Delete_Customer_Data.md
│   │   ├── Receive_an_Event.md
│   │   ├── Retrieve_Customer's_info.md
│   │   └── Retrieve_Rates.md
│   └── Platform_Server/
│       ├── JSON_RPC_API/
│       │   ├── Overview.md
│       │   └── Method_Docs_Links.txt
│       └── Transactions/
│           ├── Retrieve_a_List_of_Transactions.md
│           └── Retrieve_a_Transaction.md
├── SEP_GUIDE/
│   ├── Stellar Info File (SEP-1).md
│   ├── Stellar Authentication (SEP-10) _ Stellar Docs.md
│   ├── Stellar Authentication for Contract Accounts (SEP-45).md
│   ├── Programmatic Deposits and Withdrawals (SEP-6)/
│   │   ├── Getting Started _ Stellar Docs.md
│   │   ├── Configuration.md
│   │   └── Integration.md
│   ├── Hosted Deposits and Withdrawals (SEP-24)/
│   │   ├── Gettin_Started.md
│   │   ├── Configuration.md
│   │   ├── Integration.md
│   │   ├── Example.md
│   │   ├── FAQ.md
│   │   └── Set_Up_A_Production_Server.md
│   └── Cross-Border Payments (SEP-31)/
│       ├── Getting_Started.md                    near-empty stub
│       ├── COnfiguration.md
│       └── Integration.md
└── ecosystem/
    ├── README.md                                 (index of all SEPs: number/title/author/status)
    ├── sep-0001.md … sep-0059.md                  (58 files; no sep-0036)
```

## Directory-by-directory guide

### `Product_Overview.md`

The front page: what the Anchor Platform is, the list of SEPs it implements
(SEP-1, 6, 10, 12, 24, 31, 38, 45), key features, and links out to every other
section. Start here for orientation.

### `Admin_Guide/`

Operating the platform itself (not SEP-specific integration work).

- `Architecture.md` — the components (Client, SEP Server, Business Server,
  Platform Server, Postgres DB, Kafka, Event Service, Payment Observer) and how
  they talk to each other. Read this before touching config.
- `Getting_Started.md` — local TESTNET-only quick-start via Docker Compose
  (`quick-run` folder, `ap_start.sh`), testing with the Stellar Demo Wallet, and
  how to swap the bundled reference business server for your own.
- `Assets_and_wallet_clients.md` — **mislabeled**: despite the name, its
  content is a duplicate of `Getting_Started.md` (Docker Compose quick-start),
  not asset/client-wallet configuration. Asset/currency config examples
  actually live in the `SEP_GUIDE/*/Configuration.md` files (`[[CURRENCIES]]`
  blocks in `stellar.toml`).
- `Event_Handling/Getting_Started.md` — the event/webhook service: what it
  notifies (business servers via `POST /event`, client apps via SEP-6/12/24/31
  schemas), and why it exists (avoids polling).
- `Event_Handling/Integration.md` — **empty file** (0 bytes).
- `Event_Handling/Delivery_Gurantees.md` — **empty file** (0 bytes). (Typo in
  filename — "Gurantees" — preserved as-is on disk.)

### `API_References/Callbacks_Server/`

The API your business/callback server must implement; the Anchor Platform calls
these endpoints.

- `Create_or_Update_Customer's_Info.md` — `PUT /customer`, forwards SEP-12 KYC
  submissions; full field list (name, address, bank details, tax id, etc).
- `Retrieve_Customer's_info.md` — `GET /customer`, lets clients check what
  fields are still required or the status of a previously-submitted customer.
- `Delete_Customer_Data.md` — `DELETE /customer/:id`, SEP-12 deletion request.
- `Retrieve_Rates.md` — `GET /rate`, SEP-38 indicative/firm exchange-rate
  quotes, including the fee/price validation rules the Platform enforces.
- `Receive_an_Event.md` — `POST /event`, the payload shape your server receives
  for `transaction_created`, `transaction_status_changed`, `quote_created`,
  `customer_updated`.

### `API_References/Platform_Server/`

The internal API the business server uses to read/update transaction state.

- `Transactions/Retrieve_a_List_of_Transactions.md` — `GET /transactions`,
  pagination, filtering by `sep`/`statuses`, ordering.
- `Transactions/Retrieve_a_Transaction.md` — `GET /transactions/:id`, full
  transaction schema (amounts, status enum, refunds, memo, client info, etc).
- `JSON_RPC_API/Overview.md` — what JSON-RPC is and why the Platform API uses
  it for transaction-status notifications.
- `JSON_RPC_API/Method_Docs_Links.txt` — plain list of URLs, one per RPC method
  (`do_stellar_payment`, `do_stellar_refund`, `get_transaction`,
  `get_transactions`, `notify_amounts_updated`, `notify_customer_info_updated`,
  `notify_interactive_flow_completed`, `notify_offchain_funds_*`,
  `notify_onchain_funds_*`, `notify_refund_*`, `notify_transaction_*`,
  `notify_trust_set`, `request_offchain_funds`, `request_onchain_funds`,
  `request_trust`). Treat this as the RPC method index — the method docs
  themselves are not mirrored locally, only linked.

### `SEP_GUIDE/`

Practical, per-SEP integration guides. Files directly under `SEP_GUIDE/` cover
SEPs needed by every flow (discovery + auth); subfolders cover the three
transfer SEPs.

- `Stellar Info File (SEP-1).md` — the `stellar.toml` discovery file every
  other SEP depends on; minimal example included.
- `Stellar Authentication (SEP-10) _ Stellar Docs.md` — classic/muxed account
  (`G...`/`M...`) challenge-response auth, JWT issuance, `dev.env` flags.
- `Stellar Authentication for Contract Accounts (SEP-45).md` — same idea for
  Soroban contract accounts (`C...`), using authorization-entry simulation via
  Stellar RPC; explicitly does not replace SEP-10.
- `Programmatic Deposits and Withdrawals (SEP-6)/` — non-interactive
  deposit/withdraw flow (client collects KYC itself, no iframe/webview).
  - `Getting Started _ Stellar Docs.md` — end-to-end user experience walkthrough.
  - `Configuration.md` — `SEP6_ENABLED`/`SEP12_ENABLED`/`SEP38_ENABLED` env vars
    and `stellar.toml` changes.
  - `Integration.md` — notifying the Platform of transaction progress via
    JSON-RPC, and the customer-info/quote callbacks your server must implement.
- `Hosted Deposits and Withdrawals (SEP-24)/` — interactive (webview/iframe)
  deposit/withdraw flow.
  - `Gettin_Started.md` — user experience walkthrough (filename typo preserved).
  - `Configuration.md` — `stellar.toml` changes (`TRANSFER_SERVER_SEP0024`,
    `WEB_AUTH_ENDPOINT`, `[[CURRENCIES]]`).
  - `Integration.md` — JSON-RPC status notifications, securing the Platform
    API, quote/fee callback.
  - `Example.md` — how to build the interactive webview and consume the signed
    JWT `token` query param the Platform hands your UI for session handoff.
  - `FAQ.md` — JWT field reference (`exp`, `sub`, `jti`, `data.*`), how fees are
    currently expected to be shown (in-webview, not via `/fee`), how to
    identify the user/wallet from the token.
  - `Set_Up_A_Production_Server.md` — moving from testnet to mainnet: separate
    environments, network passphrase, Horizon URL.
- `Cross-Border Payments (SEP-31)/` — receive-only, anchor-to-anchor payments
  (no end-user wallet UI).
  - `Getting_Started.md` — **stub**: only contains the heading, no body content.
  - `COnfiguration.md` — `stellar.toml` changes (`DIRECT_PAYMENT_SERVER`,
    `[[CURRENCIES]]`); filename has a preserved typo (capital "O").
  - `Integration.md` — required callback endpoints (customer GET/PUT/DELETE,
    `GET /rate`, `GET /transactions`, JSON-RPC), plus a docker-compose snippet
    for adding the business server.

### `ecosystem/`
The full, unedited set of Stellar Ecosystem Proposal specs (protocol-level
ground truth, not Anchor-Platform-specific). `README.md` is itself a
navigable index — a table of every SEP number, title, author, and status
(Active/Draft/Final/Abandoned) with relative links. Rather than duplicating
that table here, go straight to `ecosystem/README.md` and follow its links.
The SEPs most relevant to the guides above:

| SEP | Title | File |
| --- | --- | --- |
| SEP-1 | Stellar Info File | `ecosystem/sep-0001.md` |
| SEP-6 | Deposit and Withdrawal API | `ecosystem/sep-0006.md` |
| SEP-10 | Stellar Authentication | `ecosystem/sep-0010.md` |
| SEP-12 | KYC API | `ecosystem/sep-0012.md` |
| SEP-24 | Hosted Deposit and Withdrawal | `ecosystem/sep-0024.md` |
| SEP-31 | Cross-Border Payments API | `ecosystem/sep-0031.md` |
| SEP-38 | Anchor RFQ API | `ecosystem/sep-0038.md` |
| SEP-45 | Stellar Web Authentication for Contract Accounts | `ecosystem/sep-0045.md` |

Note: `sep-0025.md`, `sep-0027.md`, `sep-0042.md`, `sep-0043.md`, `sep-0044.md`
exist as files on disk but are **not** listed in `README.md`'s table (likely
superseded/untracked numbers) — open the file directly if you need one of
these, don't rely on the README index for them. `sep-0036.md` does not exist
(gap in numbering, not a missing file).

## Known gaps / inconsistencies

These are flagged here so an agent doesn't waste time treating them as
content to extract — they're artifacts of how this folder was assembled, not
things to silently "fix" by renaming or guessing intended content:

1. `Admin_Guide/Assets_and_wallet_clients.md` — contains the wrong content
   (a duplicate of `Admin_Guide/Getting_Started.md`), not asset/wallet-client
   configuration.
2. `Admin_Guide/Event_Handling/Integration.md` — 0 bytes.
3. `Admin_Guide/Event_Handling/Delivery_Gurantees.md` — 0 bytes.
4. `SEP_GUIDE/Cross-Border Payments (SEP-31)/Getting_Started.md` — 10 lines,
   only the frontmatter and a bare "Getting Started" heading, no body.
5. Several filenames carry typos or inconsistent casing that are load-bearing
   (they must be matched exactly, not corrected): `Gettin_Started.md`,
   `COnfiguration.md`, `Delivery_Gurantees.md`.
