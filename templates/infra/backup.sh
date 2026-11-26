#!/usr/bin/env sh
set -eu

TIMESTAMP="$(date +%Y-%m-%d_%H-%M-%S)"
pg_dump "$DATABASE_URL" | gzip > "/tmp/backup-${TIMESTAMP}.sql.gz"
rclone copy "/tmp/backup-${TIMESTAMP}.sql.gz" "r2:${R2_BUCKET}/backups/"
