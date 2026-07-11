# Running the consoles locally (register + admin)

You only need the repo and Node. Both consoles proxy their API calls to the **live backend**
(`api.nordstern.live`), so there is no AWS access, no server, and no CORS to deal with. You get
hot reload against real data.

## Prerequisites

- **Node 20 or newer** and **git**

## Setup

```bash
# 1. Clone and get the latest main
git clone https://github.com/manovHacksaw/nordstern.git
cd nordstern
git checkout main && git pull

# 2. Install the console workspace once (installs founder-console, admin-console, shared-ui, shared-auth)
cd platform
npm install
```

## Run

Each console defaults to port 3000, so run them on different ports. `API_URL` makes the dev
server proxy `/api/*` to the live backend.

```bash
# Register / founder console  ->  http://localhost:3000
cd platform/founder-console
API_URL=https://api.nordstern.live npm run dev
```

```bash
# Admin console (new terminal, port 3001)  ->  http://localhost:3001
cd platform/admin-console
API_URL=https://api.nordstern.live npm run dev -- -p 3001
```

## What works locally

- **Register wizard and redeem page** (`/` and `/redeem`): fully, no login needed. The redeem
  page reads its token from the URL, so add `?token=anything` if you want the token field
  pre-filled while styling. The value only matters when you actually submit.
- **Admin console**: log in with the internal admin credentials (ask the team). The session
  cookie is host-only, so it works on localhost against the live backend.

## Where the UI lives

| Surface | Path |
| --- | --- |
| Register wizard | `platform/founder-console/app/(register)/` + `components/onboarding/` |
| Redeem page | `platform/founder-console/app/(auth)/redeem/page.tsx` |
| Admin console | `platform/admin-console/app/` |
| Shared UI primitives (Card, Button, Input, ...) | `platform/shared-ui/` |

## Notes

- To point at a different backend (for example a local stack), change `API_URL`. It defaults to
  `http://localhost:4000` if unset, which expects a locally running `platform-api`.
- The full local stack (database, platform-api, control-plane, all consoles) runs via
  `anchor-service/scripts/dev.sh`. Use that only if you need authenticated flows fully offline.
