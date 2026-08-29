#!/bin/bash

# =================================================================
# UroLOG Pre-start Script
# Ensures database migrations are applied before the application starts.
# =================================================================

# Let the DB start (simple delay, Docker usually handles this with depends_on)
# but for internal networking, a short wait is safer.
echo "[PRESTART] Checking database state..."

# Run migrations
echo "[PRESTART] Running alembic migrations..."
if alembic upgrade head; then
    echo "[PRESTART] Migrations applied successfully."
else
    echo "[PRESTART] ERROR: Migration failed! Attempting to detect Divergent History..."
    
    # Check for the known missing revision issue
    CURRENT_REV=$(alembic current 2>&1)
    if [[ $CURRENT_REV == *"Can't locate revision identified by"* ]]; then
        MISSING_REV=$(echo $CURRENT_REV | grep -oP "identified by '\K[^']+")
        echo "[PRESTART] Detected missing revision: $MISSING_REV"
        echo "[PRESTART] This usually happens due to uncommitted local migrations."
        # We don't automatically fix it here to avoid data loss, but we log it clearly.
        echo "[PRESTART] ACTION REQUIRED: Use 'alembic stamp <valid_rev>' to fix the chain."
    fi
fi

# Create required static directories if they don't exist
mkdir -p static/documents static/photos static/imaging static/ai_scribe_templates

# Start the application
echo "[PRESTART] Starting application..."
exec "$@"
