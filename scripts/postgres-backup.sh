#!/bin/sh
set -eu
BACKUP_DIR="${BACKUP_DIR:-/backups}"
INTERVAL="${BACKUP_INTERVAL_SECONDS:-86400}"
RETENTION="${BACKUP_RETENTION_DAYS:-14}"
mkdir -p "$BACKUP_DIR"
echo "[postgres-backup] service started; interval=${INTERVAL}s retention=${RETENTION}d"
while true; do
  timestamp=$(date +%Y-%m-%d_%H-%M-%S)
  target="$BACKUP_DIR/gymcrm_$timestamp.dump"
  until pg_isready >/dev/null 2>&1; do sleep 2; done
  if pg_dump --format=custom --file="$target"; then
    echo "[postgres-backup] backup completed: $target"
    find "$BACKUP_DIR" -type f -name 'gymcrm_*.dump' -mtime "+$RETENTION" -delete
  else
    rm -f "$target"
    echo "[postgres-backup] backup failed; retrying in 60s" >&2
    sleep 60
    continue
  fi
  sleep "$INTERVAL"
done
