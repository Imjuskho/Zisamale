# Zisamale - developer task runner
#
# Usage:
#   make test-api          Run Cloud API unit tests
#   make test-ml           Run ML pipeline tests
#   make test-dashboards   Run dashboard (vitest) tests
#   make test-integration  Run cross-service integration tests
#   make test-all          Run every test suite
#   make lint              Ruff lint the API and ML services
#   make dev               Start all Docker services
#   make stop              Stop all Docker services
#   make clean             Remove caches, build artifacts and volumes

PYTHON := $(abspath $(shell [ -x ".venv/bin/python" ] && echo .venv/bin/python || command -v python3))
PIP := $(shell [ -x ".venv/bin/pip" ] && echo .venv/bin/pip || echo pip3)
COMPOSE := docker compose -f docker-compose.yml

.PHONY: help test-api test-ml test-dashboards test-integration test-all \
        lint format dev stop logs clean

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

test-api: ## Run API unit tests
	cd services/api && ENVIRONMENT=testing $(PYTHON) -m pytest tests/ -v

test-ml: ## Run ML pipeline tests
	cd services/ml && $(PYTHON) -m pytest tests/ -v

test-dashboards: ## Run dashboard tests (vitest)
	cd services/dashboards && npm run test

test-integration: ## Run integration tests (self-contained, no services needed)
	PYTHONPATH=services/api $(PYTHON) -m pytest tests/integration/ -v

test-all: test-api test-ml test-dashboards test-integration ## Run every suite

lint: ## Ruff check API + ML code
	cd services/api && $(PYTHON) -m ruff check .
	cd services/ml && $(PYTHON) -m ruff check .

format: ## Ruff auto-fix imports/style in API + ML code
	cd services/api && $(PYTHON) -m ruff check --fix .
	cd services/ml && $(PYTHON) -m ruff check --fix .

dev: ## Start all Docker services (postgres, redis, rabbitmq, api, dashboards)
	$(COMPOSE) up --build -d
	@echo "API        -> http://localhost:8000/docs"
	@echo "Dashboards -> http://localhost:3000"
	@echo "RabbitMQ   -> http://localhost:15672"

stop: ## Stop all Docker services
	$(COMPOSE) down

logs: ## Tail Docker service logs
	$(COMPOSE) logs -f --tail=100

clean: ## Remove caches and build artifacts
	find . -type d \( -name __pycache__ \
	                   -o -name .pytest_cache \
	                   -o -name .ruff_cache \
	                   -o -name .mypy_cache \) \
	    -not -path "./.venv/*" -exec rm -rf {} + 2>/dev/null || true
	rm -rf services/dashboards/dist services/dashboards/coverage \
	       htmlcov .coverage coverage.xml junit-report.xml
	find . -name "*.pyc" -not -path "./.venv/*" -delete 2>/dev/null || true
	-$(COMPOSE) down --remove-orphans 2>/dev/null
