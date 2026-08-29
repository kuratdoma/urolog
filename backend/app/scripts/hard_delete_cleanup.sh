#!/bin/bash

# Define function to run psql query
pquery() {
    docker exec urolog_db psql -U urologadmin -d urolog -t -A -c "$1"
}

# 1. DELETE FILES
echo "Checking orphaned physical files..."
paths=$(pquery "
SELECT '/app/uploads/' || dosya_yolu FROM fotograflar WHERE is_deleted=true AND dosya_yolu IS NOT NULL
UNION
SELECT '/app/uploads/' || dosya_yolu FROM tetkikler WHERE is_deleted=true AND dosya_yolu IS NOT NULL
UNION
SELECT '/app/uploads/' || dosya_yolu FROM sharded_clinical_dosyalar WHERE is_deleted=true AND dosya_yolu IS NOT NULL;
")

files_deleted=0
files_missing=0
if [ -n "$paths" ]; then
    for p in $paths; do
        # check if file exists
        if docker exec urolog_backend test -f "$p"; then
            docker exec urolog_backend rm -f "$p"
            ((files_deleted++))
        else
            ((files_missing++))
        fi
    done
fi

echo "Physical Files deleted: $files_deleted"
echo "Physical Files missing from disk already: $files_missing"
echo "Starting DB Hard Delete..."

# 2. HARD DELETE DB
tables=$(pquery "SELECT table_name FROM information_schema.columns WHERE column_name = 'is_deleted' AND table_schema = 'public';")

echo -e "\n----- HARD DELETE SUMMARY -----"
total=0
for tbl in $tables; do
    # Get count
    count=$(pquery "SELECT count(*) FROM $tbl WHERE is_deleted = true;")
    if [ "$count" -gt 0 ]; then
        # Get first 3 UUIDs
        uuids=$(pquery "SELECT id FROM $tbl WHERE is_deleted = true LIMIT 3;")
        
        # We loop delete to handle self-referential or simple foreign keys if possible, but standard DELETE won't cascade automatically.
        # Just attempt the delete
        pquery "DELETE FROM $tbl WHERE is_deleted = true;" >/dev/null 2>&1
        
        # Re-check count
        rem=$(pquery "SELECT count(*) FROM $tbl WHERE is_deleted = true;")
        del=$((count - rem))
        
        if [ "$del" -gt 0 ]; then
             # Format output cleanly
             printf "Table: %-30s | Records Deleted: %d\n" "$tbl" "$del"
             echo "UUIDs: $(echo $uuids | tr '\n' ', ')..."
             total=$((total + del))
        fi
        if [ "$rem" -gt 0 ]; then
             printf "Table: %-30s | Blocked Records (FK): %d\n" "$tbl" "$rem"
        fi
    fi
done

echo "TOTAL: $total records removed permanently from DB."
