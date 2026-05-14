#!/usr/bin/env bash
# Backup diário do banco PostgreSQL — executa via cron no EC2
# Configuração: adicione ao crontab com `crontab -e`:
#   0 3 * * * /opt/mqp/scripts/backup.sh >> /var/log/mqp-backup.log 2>&1

set -euo pipefail

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/opt/mqp/backups"
BACKUP_FILE="${BACKUP_DIR}/mqp_${TIMESTAMP}.sql.gz"
RETAIN_DAYS=14  # manter backups dos últimos N dias

# S3 (opcional) — defina estas variáveis se quiser upload para S3:
# export AWS_ACCESS_KEY_ID="..."
# export AWS_SECRET_ACCESS_KEY="..."
S3_BUCKET="${S3_BUCKET:-}"  # ex: "s3://meu-bucket/mqp-backups/"

mkdir -p "$BACKUP_DIR"

# Carrega variáveis do .env do projeto
ENV_FILE="/opt/mqp/.env"
if [[ -f "$ENV_FILE" ]]; then
  export $(grep -E '^(DATABASE_URL|POSTGRES_)' "$ENV_FILE" | xargs)
fi

# Extrai credenciais da DATABASE_URL (formato: postgresql://user:pass@host:port/db)
if [[ -n "${DATABASE_URL:-}" ]]; then
  DB_USER=$(echo "$DATABASE_URL" | sed -E 's|.*://([^:]+):.*|\1|')
  DB_PASS=$(echo "$DATABASE_URL" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|')
  DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:/]+).*|\1|')
  DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
  DB_NAME=$(echo "$DATABASE_URL" | sed -E 's|.*/([^?]+).*|\1|')
else
  DB_USER="${POSTGRES_USER:-mqp}"
  DB_PASS="${POSTGRES_PASSWORD:-}"
  DB_HOST="localhost"
  DB_PORT="5432"
  DB_NAME="${POSTGRES_DB:-mqp}"
fi

echo "[$(date -Iseconds)] Iniciando backup: $BACKUP_FILE"

PGPASSWORD="$DB_PASS" pg_dump \
  -h "$DB_HOST" -p "$DB_PORT" \
  -U "$DB_USER" "$DB_NAME" \
  --no-owner --no-acl \
  | gzip > "$BACKUP_FILE"

SIZE=$(du -sh "$BACKUP_FILE" | cut -f1)
echo "[$(date -Iseconds)] Backup concluído: $SIZE"

# Upload para S3 (opcional)
if [[ -n "$S3_BUCKET" ]] && command -v aws &>/dev/null; then
  aws s3 cp "$BACKUP_FILE" "${S3_BUCKET}$(basename "$BACKUP_FILE")" --quiet
  echo "[$(date -Iseconds)] Upload S3 concluído: ${S3_BUCKET}$(basename "$BACKUP_FILE")"
fi

# Remove backups mais antigos que RETAIN_DAYS
find "$BACKUP_DIR" -name "mqp_*.sql.gz" -mtime "+${RETAIN_DAYS}" -delete
echo "[$(date -Iseconds)] Limpeza de backups antigos concluída (>${RETAIN_DAYS} dias)"
