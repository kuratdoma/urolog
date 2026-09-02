import os
from pathlib import Path
import psycopg2


def get_connection():
    # SEC: hardcoded fallback credential kaldırıldı — DATABASE_URL yoksa
    # sessizce gerçek bir şifreye düşmek yerine açıkça hata ver.
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL environment variable is not set.")
    if db_url.startswith("postgresql+asyncpg"):
        db_url = db_url.replace("+asyncpg", "")

    return psycopg2.connect(db_url)


file_columns_map = [
    {"table": "fotograflar", "file_cols": ["dosya_yolu", "dosya_adi"]},
    {"table": "tetkikler", "file_cols": ["dosya_yolu", "dosya_adi"]},
    {"table": "sharded_clinical_dosyalar", "file_cols": ["dosya_yolu", "dosya_adi"]},
    {"table": "finans_islemler", "file_cols": ["belge_url"]},
]


def process_file_deletions(conn):
    deleted_files = 0
    missing_files = 0
    base_dir = Path("/app/uploads")

    with conn.cursor() as cur:
        for tbl_info in file_columns_map:
            tbl = tbl_info["table"]
            cols = tbl_info["file_cols"]

            cur.execute("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = %s);", (tbl,))
            if not cur.fetchone()[0]:
                continue

            cols_str = ", ".join(cols)
            cur.execute(f"SELECT id, {cols_str} FROM {tbl} WHERE is_deleted = true;")
            rows = cur.fetchall()

            for row in rows:
                for idx, col_name in enumerate(cols):
                    val = row[idx + 1]  # id is at 0
                    if not val:
                        continue
                    val = str(val).strip()
                    if not val:
                        continue

                    if val.startswith("/"):
                        local_path = Path("/app" + val)
                        if not local_path.is_relative_to("/app/uploads") and not local_path.is_relative_to("/app/static"):
                            local_path = Path("/app/uploads" + val)
                    else:
                        local_path = base_dir / val

                    try:
                        if local_path.exists() and local_path.is_file():
                            os.remove(local_path)
                            deleted_files += 1
                        else:
                            missing_files += 1
                    except Exception as e:
                        print(f"Error accessing/deleting file {local_path}: {e}")

    return deleted_files, missing_files


def delete_from_db(conn):
    summary = {}
    uuids = {}
    failed_tables = {}

    with conn.cursor() as cur:
        cur.execute("SELECT table_name FROM information_schema.columns WHERE column_name = 'is_deleted' AND table_schema = 'public';")
        tables = [r[0] for r in cur.fetchall()]

        progress = True
        iteration = 0
        while progress and iteration < 5:
            progress = False
            iteration += 1
            for tbl in tables:
                try:
                    cur.execute(f"SELECT id::text FROM {tbl} WHERE is_deleted = true;")
                    del_ids = [r[0] for r in cur.fetchall()]
                    if not del_ids:
                        continue

                    cur.execute(f"DELETE FROM {tbl} WHERE is_deleted = true;")
                    conn.commit()

                    if tbl not in summary:
                        summary[tbl] = 0
                        uuids[tbl] = []

                    summary[tbl] += len(del_ids)
                    uuids[tbl].extend(del_ids)
                    progress = True
                except Exception:
                    conn.rollback()

        for tbl in tables:
            try:
                cur.execute(f"SELECT count(*) FROM {tbl} WHERE is_deleted = true;")
                rem = cur.fetchone()[0]
                if rem > 0:
                    failed_tables[tbl] = rem
            except:
                conn.rollback()

    return summary, uuids, failed_tables


def main():
    try:
        conn = get_connection()
        print("Checking orphaned physical files...")
        files_deleted, files_missing = process_file_deletions(conn)
        print(f"Physical Files deleted: {files_deleted}")
        print(f"Physical Files missing from disk already: {files_missing}")

        print("Starting DB Hard Delete...")
        summary, uuids, failed = delete_from_db(conn)

        print("\n----- HARD DELETE SUMMARY -----")
        total = 0
        for k, v in summary.items():
            print(f"Table: {k.ljust(30)} | Records Deleted: {v}")
            total += v
        print(f"TOTAL: {total} records removed permanently from DB.")

        if failed:
            print("\n----- FAILED CASCADES (Foreign Key Blocked) -----")
            for k, v in failed.items():
                print(f"Table: {k.ljust(30)} | Blocked Records: {v}")

        print("\n----- DELETED UUIDs (First 3 per table) -----")
        for k, _uuids in uuids.items():
            print(f"{k}: {_uuids[:3]}{'...' if len(_uuids)>3 else ''}")

        conn.close()

    except Exception as e:
        print(f"Critical error: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
