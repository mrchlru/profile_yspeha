#!/usr/bin/env bash
# Railway Root Directory сервиса = web → деплой только из корня репозитория.
set -euo pipefail
cd "$(dirname "$0")"
exec railway up --detach "$@"
