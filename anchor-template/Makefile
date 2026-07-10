# ==============================================================================
# NordStern Standalone Anchor Kit — Makefile
# ==============================================================================

.PHONY: setup up down logs test clean

setup:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Created .env from .env.example. Please review and fill in credentials if needed."; \
	fi
	node scripts/setup-testnet.mjs

up:
	docker compose up --build

down:
	docker compose down -v

logs:
	docker compose logs -f

test:
	cd business-server && npm run test

clean:
	docker compose down -v
	rm -f .env config/stellar.toml config/assets.yaml
