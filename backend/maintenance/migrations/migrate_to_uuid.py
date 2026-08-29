#!/usr/bin/env python3
"""
Migration Script: Convert Integer IDs to UUID format
Reads from old backup and imports to new UUID-based schema
"""

import asyncio
import gzip
import re
import uuid
import sys
import os
from datetime import datetime, date
from typing import Dict, List, Any, Optional
from dateutil import parser as date_parser

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.db.session import SessionLocal

BACKUP_PATH = "/data_import/urolog_db_2025-12-29_14-05.sql.gz"

# Tables that have hasta_id as foreign key (need UUID conversion)
TABLES_WITH_HASTA_ID = [
    'anamnezler',
    'durum_bildirir_raporlari',
    'fotograf_arsivi',
    'genel_lab_sonuclari',
    'goruntuleme_sonuclari',
    'hasta_dosyalari',
    'hasta_finans_hareketleri',
    'hasta_notlari',
    'idrar_tahlilleri',
    'istirahat_raporlari',
    'lab_uroflowmetri',
    'muayeneler',
    'operasyonlar',
    'planlar',
    'randevular',
    'sperm_analizleri',
    'telefon_gorusmeleri',
    'tetkik_sonuclari',
    'tibbi_mudahale_raporlari',
    'urodinamiler',
]

# Tables without hasta_id (direct copy with minor adjustments)
TABLES_WITHOUT_HASTA_ID = [
    'ekip_uyeleri',
    'hizmet_tanimlari',
    'icd_tanilar',
    'ilac_tanimlari',
    'kasa_tanimlari',
    'kurumlar',
    'sablon_tanimlari',
    'system_settings',
]

# Columns that need date/datetime conversion
DATE_COLUMNS = ['tarih', 'dogum_tarihi', 'baslangic_tarihi', 'bitis_tarihi', 'kontrol_tarihi']
DATETIME_COLUMNS = ['created_at', 'updated_at', 'start', 'end']


def parse_copy_block(lines: List[str], start_idx: int) -> tuple:
    """Parse a COPY block and return table name, columns, and data rows"""
    header_line = lines[start_idx]
    
    # Extract table name and columns
    match = re.match(r'COPY public\.(\w+) \(([^)]+)\) FROM stdin;', header_line)
    if not match:
        return None, None, [], start_idx + 1
    
    table_name = match.group(1)
    columns = [c.strip().strip('"') for c in match.group(2).split(',')]
    
    data_rows = []
    idx = start_idx + 1
    while idx < len(lines) and lines[idx].strip() != '\\.' and not lines[idx].startswith('COPY '):
        if lines[idx].strip():
            data_rows.append(lines[idx].rstrip('\n'))
        idx += 1
    
    return table_name, columns, data_rows, idx + 1


def parse_row(row: str, num_columns: int) -> List[str]:
    """Parse a tab-separated row, handling escaped values"""
    values = row.split('\t')
    # Ensure we have the right number of columns
    while len(values) < num_columns:
        values.append('\\N')
    return values[:num_columns]


def convert_value(val: str, col_name: str = None) -> Any:
    """Convert a PostgreSQL dump value to Python"""
    if val == '\\N' or val == '' or val is None:
        return None
    
    # Unescape special characters
    val = val.replace('\\n', '\n').replace('\\r', '\r').replace('\\t', '\t')
    
    # Handle date columns
    if col_name:
        if col_name in DATE_COLUMNS:
            try:
                parsed = date_parser.parse(val)
                return parsed.date()
            except:
                return None
        elif col_name in DATETIME_COLUMNS:
            try:
                parsed = date_parser.parse(val)
                return parsed
            except:
                return None
    
    return val


async def main():
    print("="*60)
    print("UUID Migration Script v2")
    print("="*60)
    
    # Read and decompress backup
    print(f"\n[1/6] Reading backup file: {BACKUP_PATH}")
    with gzip.open(BACKUP_PATH, 'rt', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    lines = content.split('\n')
    print(f"      Total lines: {len(lines)}")
    
    # Parse all COPY blocks
    print("\n[2/6] Parsing COPY blocks...")
    tables_data = {}
    idx = 0
    while idx < len(lines):
        if lines[idx].startswith('COPY public.'):
            table_name, columns, data_rows, next_idx = parse_copy_block(lines, idx)
            if table_name:
                tables_data[table_name] = {
                    'columns': columns,
                    'rows': data_rows
                }
                print(f"      {table_name}: {len(data_rows)} rows")
            idx = next_idx
        else:
            idx += 1
    
    # Create ID mapping for hastalar
    print("\n[3/6] Creating UUID mapping for hastalar...")
    id_mapping: Dict[int, str] = {}  # old_id -> new_uuid
    
    if 'hastalar' in tables_data:
        hastalar_cols = tables_data['hastalar']['columns']
        id_col_idx = hastalar_cols.index('id')
        
        for row in tables_data['hastalar']['rows']:
            values = parse_row(row, len(hastalar_cols))
            old_id = int(values[id_col_idx])
            new_uuid = str(uuid.uuid4())
            id_mapping[old_id] = new_uuid
        
        print(f"      Created {len(id_mapping)} UUID mappings")
    
    # Connect to database
    print("\n[4/6] Connecting to database...")
    async with SessionLocal() as db:
        # Import hastalar first
        print("\n[5/6] Importing data...")
        
        if 'hastalar' in tables_data:
            print("      Importing hastalar...")
            hastalar_cols = tables_data['hastalar']['columns']
            id_col_idx = hastalar_cols.index('id')
            
            count = 0
            errors = 0
            for row in tables_data['hastalar']['rows']:
                values = parse_row(row, len(hastalar_cols))
                old_id = int(values[id_col_idx])
                new_uuid = id_mapping[old_id]
                
                # Build column-value pairs (excluding 'id', will use UUID)
                insert_cols = ['id']
                insert_vals = [new_uuid]
                
                for i, col in enumerate(hastalar_cols):
                    if col == 'id':
                        continue
                    val = convert_value(values[i], col)
                    if val is not None:
                        insert_cols.append(col)
                        insert_vals.append(val)
                
                # Build INSERT statement
                placeholders = ', '.join([f':p{i}' for i in range(len(insert_cols))])
                cols_str = ', '.join([f'"{c}"' for c in insert_cols])
                
                params = {f'p{i}': v for i, v in enumerate(insert_vals)}
                
                try:
                    await db.execute(
                        text(f'INSERT INTO hastalar ({cols_str}) VALUES ({placeholders})'),
                        params
                    )
                    count += 1
                except Exception as e:
                    errors += 1
                    if errors <= 3:
                        print(f"      Error inserting hasta {old_id}: {str(e)[:100]}")
            
            await db.commit()
            print(f"      Imported {count} hastalar (errors: {errors})")
        
        # Import tables with hasta_id
        for table_name in TABLES_WITH_HASTA_ID:
            if table_name not in tables_data:
                continue
            
            print(f"      Importing {table_name}...")
            table_cols = tables_data[table_name]['columns']
            
            # Find hasta_id column index
            hasta_id_idx = None
            if 'hasta_id' in table_cols:
                hasta_id_idx = table_cols.index('hasta_id')
            
            count = 0
            skipped = 0
            for row in tables_data[table_name]['rows']:
                values = parse_row(row, len(table_cols))
                
                # Convert hasta_id to UUID
                if hasta_id_idx is not None:
                    old_hasta_id = values[hasta_id_idx]
                    if old_hasta_id != '\\N' and old_hasta_id:
                        try:
                            old_id_int = int(old_hasta_id)
                            if old_id_int in id_mapping:
                                values[hasta_id_idx] = id_mapping[old_id_int]
                            else:
                                skipped += 1
                                continue  # Skip if hasta not found
                        except ValueError:
                            skipped += 1
                            continue
                
                # Build column-value pairs (excluding 'id' for auto-increment)
                insert_cols = []
                insert_vals = []
                
                for i, col in enumerate(table_cols):
                    if col == 'id':
                        continue  # Skip id, let DB auto-generate
                    val = convert_value(values[i], col)
                    if val is not None:
                        insert_cols.append(col)
                        insert_vals.append(val)
                
                if not insert_cols:
                    continue
                
                placeholders = ', '.join([f':p{i}' for i in range(len(insert_cols))])
                cols_str = ', '.join([f'"{c}"' for c in insert_cols])
                
                params = {f'p{i}': v for i, v in enumerate(insert_vals)}
                
                try:
                    await db.execute(
                        text(f'INSERT INTO {table_name} ({cols_str}) VALUES ({placeholders})'),
                        params
                    )
                    count += 1
                except Exception as e:
                    if 'duplicate' not in str(e).lower():
                        if skipped < 3:
                            print(f"        Error: {str(e)[:80]}")
                    skipped += 1
            
            await db.commit()
            print(f"      Imported {count} rows (skipped {skipped})")
        
        # Import tables without hasta_id (skip updated_at for system_settings)
        for table_name in TABLES_WITHOUT_HASTA_ID:
            if table_name not in tables_data:
                continue
            
            # Skip users - we already created admin
            if table_name == 'users':
                continue
            
            print(f"      Importing {table_name}...")
            table_cols = tables_data[table_name]['columns']
            
            count = 0
            skipped = 0
            for row in tables_data[table_name]['rows']:
                values = parse_row(row, len(table_cols))
                
                # For system_settings, use key as primary
                if table_name == 'system_settings':
                    insert_cols = []
                    insert_vals = []
                    for i, col in enumerate(table_cols):
                        if col == 'updated_at':
                            continue  # Skip updated_at, use NOW()
                        val = convert_value(values[i], col)
                        if val is not None:
                            insert_cols.append(col)
                            insert_vals.append(val)
                else:
                    # Skip id column for auto-increment tables
                    insert_cols = []
                    insert_vals = []
                    for i, col in enumerate(table_cols):
                        if col == 'id':
                            continue
                        val = convert_value(values[i], col)
                        if val is not None:
                            insert_cols.append(col)
                            insert_vals.append(val)
                
                if not insert_cols:
                    continue
                
                placeholders = ', '.join([f':p{i}' for i in range(len(insert_cols))])
                cols_str = ', '.join([f'"{c}"' for c in insert_cols])
                
                params = {f'p{i}': v for i, v in enumerate(insert_vals)}
                
                try:
                    if table_name == 'system_settings':
                        # Upsert for system_settings
                        await db.execute(
                            text(f'INSERT INTO {table_name} ({cols_str}) VALUES ({placeholders}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()'),
                            params
                        )
                    else:
                        await db.execute(
                            text(f'INSERT INTO {table_name} ({cols_str}) VALUES ({placeholders})'),
                            params
                        )
                    count += 1
                except Exception as e:
                    if 'duplicate' not in str(e).lower():
                        if skipped < 2:
                            print(f"        Error: {str(e)[:80]}")
                    skipped += 1
            
            await db.commit()
            print(f"      Imported {count} rows (skipped {skipped})")
        
        # Final stats
        print("\n[6/6] Verifying import...")
        result = await db.execute(text("""
            SELECT 'hastalar' as tablo, COUNT(*) as count FROM hastalar
            UNION ALL SELECT 'muayeneler', COUNT(*) FROM muayeneler
            UNION ALL SELECT 'operasyonlar', COUNT(*) FROM operasyonlar
            UNION ALL SELECT 'randevular', COUNT(*) FROM randevular
            UNION ALL SELECT 'genel_lab_sonuclari', COUNT(*) FROM genel_lab_sonuclari
            UNION ALL SELECT 'hasta_dosyalari', COUNT(*) FROM hasta_dosyalari
            UNION ALL SELECT 'system_settings', COUNT(*) FROM system_settings
        """))
        
        print("\n" + "="*60)
        print("IMPORT COMPLETE")
        print("="*60)
        for row in result:
            print(f"  {row[0]}: {row[1]} rows")


if __name__ == "__main__":
    asyncio.run(main())
