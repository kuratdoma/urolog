import asyncio
import csv
import os
import sys
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.future import select

from app.db.session import SessionLocal, engine
from app.models.patient import Hasta
from app.models.clinical import Muayene, TetkikSonuc
from app.models.base_class import Base

# Path configurations
# Path configurations
# Varsayılan olarak scriptin yanındaki 'import_source' klasörüne bakar.
# Veya komut satırından verilen yolu kullanır: python db_import.py /yol/csvler
if len(sys.argv) > 1:
    CSV_DIR = sys.argv[1]
else:
    CSV_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "import_source")

ENCODING = "cp1254" # Common for Turkish legacy exports, fallback to 'latin-5' or 'iso-8859-9'

async def update_schema():
    """Add new columns to tables if they don't exist."""
    print("Updating schema...")
    async with engine.begin() as conn:
        # Create all tables (including new SystemSetting)
        await conn.run_sync(Base.metadata.create_all)
        
        # Check and add columns to muayeneler
        columns_to_add = [
            ("ozgecmis", "TEXT"),
            ("soygecmis", "TEXT"),
            ("kullandigi_ilaclar", "TEXT"),
            ("aliskanliklar", "TEXT"),
            ("sistem_sorgu", "TEXT"),
            ("ipss_skor", "VARCHAR"),
            ("fizik_muayene", "TEXT"),
            ("erektil_islev", "VARCHAR"),
            ("ejakulasyon", "VARCHAR"),
            ("mshq", "VARCHAR"),
            ("tani1_kodu", "VARCHAR"),
            ("tani2_kodu", "VARCHAR"),
            ("prosedur", "TEXT"),
            ("doktor", "VARCHAR"),
            ("bulgu_notu", "TEXT"),
            ("sonuc", "TEXT"),
            ("recete", "TEXT"),
            ("allerjiler", "TEXT")
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                await conn.execute(text(f"ALTER TABLE muayeneler ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
                print(f"Added column {col_name} to muayeneler")
            except Exception as e:
                print(f"Column {col_name} might already exist or error: {e}")

        # Check and add columns to hastalar
        hastalar_cols = [
            ("dogum_yeri", "VARCHAR"),
            ("kan_grubu", "VARCHAR"),
            ("medeni_hal", "VARCHAR"),
            ("kimlik_notlar", "TEXT"),
            ("doktor", "VARCHAR"),
            ("referans", "VARCHAR"),
            ("postakodu", "VARCHAR"),
            ("kurum", "VARCHAR"),
            ("sigorta", "VARCHAR"),
            ("ozelsigorta", "VARCHAR"),
            ("cocuk_sayisi", "VARCHAR"),
            ("faks", "VARCHAR")
        ]
        
        for col_name, col_type in hastalar_cols:
            try:
                await conn.execute(text(f"ALTER TABLE hastalar ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
                print(f"Added column {col_name} to hastalar")
            except Exception as e:
                print(f"Column {col_name} might already exist or error: {e}")

        # Check and add columns to tetkik_sonuclari
        tetkik_cols = [
            ("birim", "VARCHAR"),
            ("referans_araligi", "VARCHAR")
        ]
        for col_name, col_type in tetkik_cols:
            try:
                await conn.execute(text(f"ALTER TABLE tetkik_sonuclari ADD COLUMN IF NOT EXISTS {col_name} {col_type}"))
            except Exception as e:
                pass

def parse_date(date_str):
    if not date_str:
        return None
    for fmt in ["%m/%d/%Y", "%d.%m.%Y", "%Y-%m-%d"]:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None

def clean_text(text):
    if not text:
        return None
    return text.replace('\x00', '').strip()

def map_ipss(val):
    if not val:
        return "0"
    v = val.lower().strip()
    if v in ["var", "evet", "1", "true"]:
        return "1"
    if v in ["yok", "hayır", "hayir", "0", "false"]:
        return "0"
    # Try to return number if digit
    if v.isdigit():
        return str(int(v))
    return "0" # Default fallback

def get_csv_reader(file_path):
    # Kullanıcı sadece istediği dosyaları klasöre koyacağı için filtrelemeye gerek yok.
    # Dosya varsa işlenir, yoksa FileNotFoundError ile atlanır.
    filename = os.path.basename(file_path)
    
    # Dosya var mı kontrolü (her ihtimale karşı)
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"{filename} not found in source dir.")

    f = open(file_path, mode='r', encoding=ENCODING, errors='replace')
    # Skip lines until we find the header
    while True:
        pos = f.tell()
        line = f.readline()
        if not line:
            break
        if '"#","' in line:
            f.seek(pos) # Go back to start of header line
            break
            
    return csv.DictReader(f), f

async def import_data():
    async with SessionLocal() as session:
        # 1. Load Anamnez
        print("Loading Anamnez data...")
        anamnez_map = {} 
        try:
            reader, f = get_csv_reader(os.path.join(CSV_DIR, "ANAMNEZ.CSV"))
            for row in reader:
                hid = row.get("HastaRecID")
                if hid:
                    anamnez_map[hid] = {
                        "alkol": clean_text(row.get("Alkol")),
                        "sigara": clean_text(row.get("Sigara")),
                        "allerji": clean_text(row.get("Allerji")),
                        "kilac": clean_text(row.get("Kilac")),
                        "ozgecmis": clean_text(row.get("Ozgecmis")),
                        "soygecmis": clean_text(row.get("Soygecmis"))
                    }
            f.close()
        except FileNotFoundError:
            print("ANAMNEZ.CSV not found.")

        # 2. Import Patients
        print("Importing Patients...")
        legacy_id_map = {} # map[Legacy_ID] -> Real_DB_ID
        try:
            # Prefetch existing IDs and TCKNs
            result = await session.execute(select(Hasta.id, Hasta.tc_kimlik))
            rows = result.all()
            existing_ids = {r[0] for r in rows}
            # Map TCKN to existing Real ID
            tckn_map = {r[1]: r[0] for r in rows if r[1]} 
            print(f"Found {len(existing_ids)} existing patients and {len(tckn_map)} TCKNs.")

            reader, f = get_csv_reader(os.path.join(CSV_DIR, "HASTA.CSV"))
            new_patients = []
            count = 0

            for row in reader:
                try:
                    rec_id_str = row.get("HastaRecID")
                    if not rec_id_str: continue
                    rec_id = int(rec_id_str)
                    
                    # Validation for TC Kimlik
                    tc = clean_text(row.get("TCKimlik"))
                    if tc and (len(tc) != 11 or not tc.isdigit()):
                        tc = None
                    
                    # If TCKN already exists under DIFFERENT ID, remap legacy ID to usage ID
                    if tc and tc in tckn_map and tckn_map[tc] != rec_id:
                        real_id = tckn_map[tc]
                        print(f"Skipping Patient {rec_id}: Duplicate TCKN {tc} -> Remapping to {real_id}")
                        legacy_id_map[rec_id] = real_id
                        continue

                    p_data = {
                        'id': rec_id,
                        'ad': clean_text(row.get("Ad")),
                        'soyad': clean_text(row.get("Soyad")),
                        'tc_kimlik': tc,
                        'cinsiyet': clean_text(row.get("Cinsiyet")),
                        'dogum_tarihi': parse_date(row.get("DTarih")),
                        'dogum_yeri': clean_text(row.get("DYer")),
                        'kan_grubu': clean_text(row.get("Kangrubu")),
                        'meslek': clean_text(row.get("Meslek")),
                        'medeni_hal': clean_text(row.get("MedeniHal")),
                        'adres': f"{clean_text(row.get('Adres1')) or ''} {clean_text(row.get('Adres2')) or ''} {clean_text(row.get('Postakod')) or ''} {clean_text(row.get('Adres3')) or ''}".replace('  ', ' ').strip(),
                        'ev_tel': clean_text(row.get("Evtelefonu")),
                        'is_tel': clean_text(row.get("IsTelefon")),
                        'cep_tel': clean_text(row.get("Ceptelefonu")),
                        'email': clean_text(row.get("Eposta")),
                        'kimlik_notlar': clean_text(row.get("Notlar")),
                        'doktor': clean_text(row.get("Doktor")),
                        'referans': clean_text(row.get("Referans")),
                        'postakodu': clean_text(row.get("Postakod")),
                        'kurum': clean_text(row.get("Kurum")),
                        'sigorta': clean_text(row.get("Sigorta")),
                        'ozelsigorta': clean_text(row.get("OzelSigorta")),
                        'cocuk_sayisi': clean_text(row.get("Cocuksay")),
                        'faks': clean_text(row.get("Faks"))
                    }

                    if rec_id in existing_ids:
                        # Update record
                        await session.execute(text("""
                            UPDATE hastalar SET
                                ad=:ad, soyad=:soyad, tc_kimlik=:tc_kimlik, cinsiyet=:cinsiyet,
                                dogum_tarihi=:dogum_tarihi, dogum_yeri=:dogum_yeri, kan_grubu=:kan_grubu,
                                meslek=:meslek, medeni_hal=:medeni_hal, adres=:adres,
                                ev_tel=:ev_tel, is_tel=:is_tel, cep_tel=:cep_tel, email=:email,
                                kimlik_notlar=:kimlik_notlar, doktor=:doktor, referans=:referans,
                                postakodu=:postakodu, kurum=:kurum, sigorta=:sigorta,
                                ozelsigorta=:ozelsigorta, cocuk_sayisi=:cocuk_sayisi, faks=:faks
                            WHERE id=:id
                        """), p_data)
                        legacy_id_map[rec_id] = rec_id
                    else:
                        # Insert record
                        p = Hasta(**p_data)
                        session.add(p)
                        existing_ids.add(rec_id)
                        legacy_id_map[rec_id] = rec_id
                        if tc: tckn_map[tc] = rec_id
                    
                    count += 1
                    if count % 100 == 0:
                        await session.commit()
                        print(f"Processed {count} patients...")

                except Exception as e:
                    print(f"Error processing patient row: {e}")

            # Ensure remaining changes are committed
            await session.commit()
            
            f.close()
            print(f"Imported total {count} new patients.")
        except FileNotFoundError:
            print("HASTA.CSV not found.")

        # 3. Import Examinations
        print("Importing Examinations...")
        try:
            # Sync Sequence First
            await session.execute(text("SELECT setval('muayeneler_id_seq', COALESCE((SELECT MAX(id)+1 FROM muayeneler), 1), false)"))
            await session.commit()
            
            # Prefetch existing (hasta_id, tarih) -> ID map
            result = await session.execute(select(Muayene.id, Muayene.hasta_id, Muayene.tarih))
            # Map: (hasta_id, tarih) -> muayene_id
            existing_exam_map = {(r[1], r[2]): r[0] for r in result.all()}
            print(f"Found {len(existing_exam_map)} existing exams (by patient/date).")

            reader, f = get_csv_reader(os.path.join(CSV_DIR, "MUAYENE.CSV"))
            new_exams = []
            updates = [] # List of dicts for bulk update (if supported, or just loop updates)
            m_count = 0
            u_count = 0
            row_count = 0
            
            for row in reader:
                row_count += 1
                try:
                    hid_str = row.get("HastaRecID")
                    if not hid_str: continue
                    legacy_hid = int(hid_str)
                    
                    hid = legacy_id_map.get(legacy_hid)
                    if not hid: continue
                    
                    anam = anamnez_map.get(str(legacy_hid), {})
                    p_date = parse_date(row.get("Tarih"))
                    
                    # Prepare Data
                    aliskanliklar = []
                    if anam.get("alkol"): aliskanliklar.append(f"Alkol: {anam['alkol']}")
                    if anam.get("sigara"): aliskanliklar.append(f"Sigara: {anam['sigara']}")
                    if anam.get("allerji"): aliskanliklar.append(f"Allerji: {anam['allerji']}")
                    
                    s_sorgu = [] 
                    for field in ["Disuri", "Pollakiuri", "Nokturi", "Hematuri", "GenitalAkinti", "Kabizlik", "TasOyku"]:
                         val = clean_text(row.get(field))
                         if val: s_sorgu.append(f"{field}: {val}")

                     
                    tedavi_val = clean_text(row.get('Prosedur'))
                    recete_val = clean_text(row.get('Recete'))

                    data = dict(
                        hasta_id=hid,
                        tarih=p_date,
                        sikayet=clean_text(row.get("Sikayet")),
                        oyku=clean_text(row.get("Oyku")),
                        tansiyon=clean_text(row.get("Tansiyon")),
                        ates=clean_text(row.get("Ates")),
                        kvah=clean_text(row.get("KVAH")),
                        bobrek_sag=clean_text(row.get("BobrekSag")),
                        bobrek_sol=clean_text(row.get("BobrekSol")),
                        suprapubik_kitle=clean_text(row.get("SuprapubikKitle")),
                        ego=clean_text(row.get("EGO")),
                        rektal_tuse=clean_text(row.get("DRE")),
                        disuri=clean_text(row.get("Disuri")),
                        pollakiuri=map_ipss(row.get("Pollakiuri")),
                        nokturi=map_ipss(row.get("Nokturi")),
                        hematuri=clean_text(row.get("Hematuri")),
                        genital_akinti=clean_text(row.get("GenitalAkinti")),
                        kabizlik=clean_text(row.get("Kabizlik")),
                        tas_oyku=clean_text(row.get("TasOyku")),
                        catallanma=clean_text(row.get("Catallanma")),
                        projeksiyon_azalma=map_ipss(row.get("ProjeksiyonAzalma")),
                        kalibre_incelme=clean_text(row.get("KalibreIncelme")),
                        idrar_bas_zorluk=map_ipss(row.get("IdrarBasZorluk")),
                        kesik_idrar_yapma=map_ipss(row.get("KesikIdrarYapma")),
                        terminal_damlama=clean_text(row.get("TerminalDamlama")),
                        residiv_hissi=map_ipss(row.get("ResidivHissi")),
                        inkontinans=map_ipss(row.get("Inkontinans")),
                        
                        tani1=clean_text(row.get("Tani1")),
                        tani2=clean_text(row.get("Tani2")),
                        
                        erektil_islev=clean_text(row.get("Erektil")),
                        ejakulasyon=clean_text(row.get("Ejakulasyon")),
                        mshq=clean_text(row.get("MSHQ")),
                        
                        # New Fields
                        ipss_skor=clean_text(row.get("PSS")),
                        prosedur=clean_text(row.get("Prosedur")),
                        doktor=clean_text(row.get("Doktor")),
                        tani1_kodu=clean_text(row.get("TKod1")),
                        tani2_kodu=clean_text(row.get("TKod2")),
                        bulgu_notu=None,

                        
                        # Extra Mappings for Treatment/Plan/Findings
                        fizik_muayene=clean_text(row.get("BulguNot")), 
                        oneriler=f"{clean_text(row.get('Oneriler') or '')}\n{clean_text(row.get('Prosedur') or '')}".strip(), 
                        sonuc=clean_text(row.get("Sonuc")),
                        
                        tedavi=tedavi_val,
                        recete=recete_val,

                        sistem_sorgu="; ".join(s_sorgu),
                        ozgecmis=clean_text(anam.get("ozgecmis")),
                        soygecmis=clean_text(anam.get("soygecmis")),
                        kullandigi_ilaclar=clean_text(anam.get("kilac")),
                        aliskanliklar="; ".join(aliskanliklar) if aliskanliklar else None
                    )
                    
                    # UPSERT Logic
                    if (hid, p_date) in existing_exam_map:
                        # Existing -> Update
                        mid = existing_exam_map[(hid, p_date)]
                        # We perform direct update statement for speed or ORM fetch-update. 
                        # Given 2000 rows, fetch-update is fine. But we want bulk.
                        # ORM bulk update by PK is tricky in async without fetching.
                        # Let's just create a list of update params
                        # NOTE: This overrides existing data!
                        data['id'] = mid
                        updates.append(data)
                        u_count += 1
                    else:
                        # New -> Insert
                        m = Muayene(**data)
                        new_exams.append(m)
                        existing_exam_map[(hid, p_date)] = 0 # Placeholder key
                        m_count += 1

                    if len(new_exams) >= 100:
                        session.add_all(new_exams)
                        await session.commit()
                        new_exams = []
                        print(f"Committed {m_count} new exams...")
                    
                    if len(updates) >= 100:
                         await session.execute(
                             text("""
                                UPDATE muayeneler SET 
                                    sikayet=:sikayet, oyku=:oyku, tansiyon=:tansiyon, ates=:ates, kvah=:kvah,
                                    bobrek_sag=:bobrek_sag, bobrek_sol=:bobrek_sol, suprapubik_kitle=:suprapubik_kitle, ego=:ego, rektal_tuse=:rektal_tuse,
                                    disuri=:disuri, pollakiuri=:pollakiuri, nokturi=:nokturi, hematuri=:hematuri, genital_akinti=:genital_akinti, kabizlik=:kabizlik, tas_oyku=:tas_oyku,
                                    catallanma=:catallanma, projeksiyon_azalma=:projeksiyon_azalma, kalibre_incelme=:kalibre_incelme, idrar_bas_zorluk=:idrar_bas_zorluk,
                                    kesik_idrar_yapma=:kesik_idrar_yapma, terminal_damlama=:terminal_damlama, residiv_hissi=:residiv_hissi, inkontinans=:inkontinans,
                                    tani1=:tani1, tani1_kodu=:tani1_kodu, tani2=:tani2, tani2_kodu=:tani2_kodu,
                                    fizik_muayene=:fizik_muayene, oneriler=:oneriler, sonuc=:sonuc, tedavi=:tedavi, recete=:recete,
                                    sistem_sorgu=:sistem_sorgu, ozgecmis=:ozgecmis, soygecmis=:soygecmis, kullandigi_ilaclar=:kullandigi_ilaclar, aliskanliklar=:aliskanliklar,
                                    erektil_islev=:erektil_islev, ejakulasyon=:ejakulasyon, mshq=:mshq,
                                    ipss_skor=:ipss_skor, prosedur=:prosedur, doktor=:doktor, bulgu_notu=:bulgu_notu
                                WHERE id=:id
                             """),
                             updates
                         )
                         await session.commit()
                         updates = []
                         print(f"Updated {u_count} existing exams...")

                except Exception as e:
                    pass # Silently skip errors to complete bulk import
            
            if new_exams:
                session.add_all(new_exams)
                await session.commit()
                
            if updates:
                 await session.execute(
                     text("""
                        UPDATE muayeneler SET 
                            sikayet=:sikayet, oyku=:oyku, tansiyon=:tansiyon, ates=:ates, kvah=:kvah,
                            bobrek_sag=:bobrek_sag, bobrek_sol=:bobrek_sol, suprapubik_kitle=:suprapubik_kitle, ego=:ego, rektal_tuse=:rektal_tuse,
                            disuri=:disuri, pollakiuri=:pollakiuri, nokturi=:nokturi, hematuri=:hematuri, genital_akinti=:genital_akinti, kabizlik=:kabizlik, tas_oyku=:tas_oyku,
                            catallanma=:catallanma, projeksiyon_azalma=:projeksiyon_azalma, kalibre_incelme=:kalibre_incelme, idrar_bas_zorluk=:idrar_bas_zorluk,
                            kesik_idrar_yapma=:kesik_idrar_yapma, terminal_damlama=:terminal_damlama, residiv_hissi=:residiv_hissi, inkontinans=:inkontinans,
                            tani1=:tani1, tani1_kodu=:tani1_kodu, tani2=:tani2, tani2_kodu=:tani2_kodu,
                            fizik_muayene=:fizik_muayene, oneriler=:oneriler, sonuc=:sonuc, tedavi=:tedavi, recete=:recete,
                            sistem_sorgu=:sistem_sorgu, ozgecmis=:ozgecmis, soygecmis=:soygecmis, kullandigi_ilaclar=:kullandigi_ilaclar, aliskanliklar=:aliskanliklar,
                            erektil_islev=:erektil_islev, ejakulasyon=:ejakulasyon, mshq=:mshq,
                            ipss_skor=:ipss_skor, prosedur=:prosedur, doktor=:doktor, bulgu_notu=:bulgu_notu
                        WHERE id=:id
                     """),
                     updates
                 )
                 await session.commit()

            f.close()
            print(f"Scanned {row_count} rows. Imported {m_count} new, Updated {u_count} existing.")
            
            # Reset Sequence
            await session.execute(text("SELECT setval('muayeneler_id_seq', COALESCE((SELECT MAX(id)+1 FROM muayeneler), 1), false)"))
            await session.commit()
            
        except FileNotFoundError:
             print("MUAYENE.CSV not found.")

        # 4. Import Patient Notes (Follow-up) -> HNOTLAR.CSV
        print("Importing Patient Notes (Follow-up)...")
        from app.models.clinical import HastaNotu
        try:
            # Dedup for Notes (hasta_id, tarih, type)
            result = await session.execute(select(HastaNotu.hasta_id, HastaNotu.tarih, HastaNotu.tip))
            existing_notes = set([(r[0], r[1], r[2]) for r in result.all()])
            
            reader, f = get_csv_reader(os.path.join(CSV_DIR, "HNOTLAR.CSV"))
            new_notes = []
            n_count = 0
            
            for row in reader:
                try:
                    rec_id_str = row.get("RecID") or row.get("HNotRecID")
                    # Ignore RecID for PK
                    
                    hid_str = row.get("HastaRecID")
                    if not hid_str: continue
                    legacy_hid = int(hid_str)
                    hid = legacy_id_map.get(legacy_hid)
                    if not hid: continue
                    
                    n_date = parse_date(row.get("Tarih"))
                    n_type = clean_text(row.get("Tip"))
                    
                    if (hid, n_date, n_type) in existing_notes:
                        continue

                    note = HastaNotu(
                        # id=rec_id, # Let DB handle
                        hasta_id=hid,
                        tarih=n_date,
                        icerik=clean_text(row.get("Notlar")),
                        tip=n_type,
                        sembol=clean_text(row.get("Sembol"))
                    )
                    new_notes.append(note)
                    existing_notes.add((hid, n_date, n_type))
                    n_count += 1
                    
                    if len(new_notes) >= 100:
                         session.add_all(new_notes)
                         await session.commit()
                         new_notes = []
                         print(f"Committed {n_count} notes...")
                except Exception as e:
                    print(f"Error importing row: {e}")
            
            if new_notes:
                session.add_all(new_notes)
                await session.commit()
            
            f.close()
            print(f"Imported total {n_count} patient notes.")
            
            # Reset Sequence
            await session.execute(text("SELECT setval('hasta_notlari_id_seq', COALESCE((SELECT MAX(id)+1 FROM hasta_notlari), 1), false)"))
            await session.commit()

        except FileNotFoundError:
            print("HNOTLAR.CSV not found.")

        # 5. Import Imaging Results (GLABIST.CSV)
        print("Importing Imaging Results (GLABIST.CSV)...")
        try:
             # Dedup set: (hasta_id, tarih, tetkik_adi)
            result = await session.execute(select(TetkikSonuc.hasta_id, TetkikSonuc.tarih, TetkikSonuc.tetkik_adi))
            existing_results = set([(r[0], r[1], r[2]) for r in result.all()])
            
            reader, f = get_csv_reader(os.path.join(CSV_DIR, "GLABIST.CSV"))
            new_tests = []
            t_count = 0
            
            for row in reader:
                try:
                    # GLABIST: HastaRecID, RecID, Tarih, Tetkik, Sonuc, Sembol
                    
                    hid_str = row.get("HastaRecID")
                    if not hid_str: continue
                    legacy_hid = int(hid_str)
                    
                    # Remap ID
                    hid = legacy_id_map.get(legacy_hid)
                    if not hid: continue
                    
                    t_date = parse_date(row.get("Tarih"))
                    t_name = clean_text(row.get("Tetkik"))
                    
                    # Dedup
                    if (hid, t_date, t_name) in existing_results:
                        continue
                        
                    res = TetkikSonuc(
                        hasta_id=hid,
                        tarih=t_date,
                        kategori="Goruntuleme",
                        tetkik_adi=t_name,
                        sonuc=clean_text(row.get("Sonuc")),
                        sembol=clean_text(row.get("Sembol"))
                    )
                    new_tests.append(res)
                    existing_results.add((hid, t_date, t_name))
                    t_count += 1
                    
                    if len(new_tests) >= 100:
                         session.add_all(new_tests)
                         await session.commit()
                         new_tests = []
                         print(f"Committed {t_count} imaging results...")

                except Exception as e:
                    print(f"Error importing row: {e}")

            if new_tests:
                session.add_all(new_tests)
                await session.commit()
            
            f.close()
            print(f"Imported total {t_count} imaging results.")
        except FileNotFoundError:
             print("GLABIST.CSV not found.")

        # 6. Import Lab Results (LABIST.CSV)
        print("Importing Lab Results (LABIST.CSV)...")
        try:
            reader, f = get_csv_reader(os.path.join(CSV_DIR, "LABIST.CSV"))
            new_labs = []
            l_count = 0
            
            for row in reader:
                try:
                    # LABIST: HastaRecID, RecID, Tarih, Tetkik, Sonuc, Kontrol, Notlar
                    
                    hid_str = row.get("HastaRecID")
                    if not hid_str: continue
                    legacy_hid = int(hid_str)
                    
                    hid = legacy_id_map.get(legacy_hid)
                    if not hid: continue
                    
                    t_date = parse_date(row.get("Tarih"))
                    t_name = clean_text(row.get("Tetkik"))
                    
                    if (hid, t_date, t_name) in existing_results:
                         continue
                         
                    res = TetkikSonuc(
                        hasta_id=hid,
                        tarih=t_date,
                        kategori="Laboratuvar",
                        tetkik_adi=t_name,
                        sonuc=clean_text(row.get("Sonuc")),
                        sembol=clean_text(row.get("Kontrol")) # Using Kontrol column as Sembol/Flag
                    )
                    new_labs.append(res)
                    existing_results.add((hid, t_date, t_name))
                    l_count += 1
                    
                    if len(new_labs) >= 100:
                        session.add_all(new_labs)
                        await session.commit()
                        new_labs = []
                        print(f"Committed {l_count} lab results...")

                except Exception as e:
                    print(f"Error importing row: {e}")
            
            if new_labs:
                session.add_all(new_labs)
                await session.commit()
            
            f.close()
            print(f"Imported total {l_count} lab results.")
        except FileNotFoundError:
            print("LABIST.CSV not found.")


            
        # 7. Import Operations (OPERASYON.CSV)
        print("Importing Operations (OPERASYON.CSV)...")
        from app.models.clinical import Operasyon
        try:
             # Dedup set: (hasta_id, tarih, ameliyat_adi)
            result = await session.execute(select(Operasyon.hasta_id, Operasyon.tarih, Operasyon.ameliyat))
            existing_ops = set([(r[0], r[1], r[2]) for r in result.all()])
            
            reader, f = get_csv_reader(os.path.join(CSV_DIR, "OPERASYON.CSV"))
            new_ops = []
            op_count = 0
            
            for row in reader:
                try:
                    # OPERASYON: HastaRecID, RecID, Tarih, Ameliyat, OpEkip, Hemsire, AnesteziEkip, AnesteziTur, Notlar, Patoloji, PostOp, OpVideo
                    
                    hid_str = row.get("HastaRecID")
                    if not hid_str: continue
                    legacy_hid = int(hid_str)
                    
                    # Remap ID
                    hid = legacy_id_map.get(legacy_hid)
                    if not hid: continue
                    
                    op_date = parse_date(row.get("Tarih"))
                    op_name = clean_text(row.get("Ameliyat"))
                    
                    # Dedup
                    if (hid, op_date, op_name) in existing_ops:
                        continue
                        
                    op = Operasyon(
                        hasta_id=hid,
                        tarih=op_date,
                        ameliyat=op_name,
                        pre_op_tani=clean_text(row.get("AOTani")),
                        post_op_tani=clean_text(row.get("ASTani")),
                        ekip=clean_text(row.get("OpEkip")),
                        hemsire=clean_text(row.get("Hemsire")),
                        anestezi_ekip=clean_text(row.get("AnesteziEkip")),
                        anestezi_tur=clean_text(row.get("AnesteziTur")),
                        notlar=clean_text(row.get("Notlar")),
                        patoloji=clean_text(row.get("Patoloji")),
                        post_op=clean_text(row.get("PostOp")),
                        video_url=clean_text(row.get("OpVideo"))
                    )
                    new_ops.append(op)
                    existing_ops.add((hid, op_date, op_name))
                    op_count += 1
                    
                    if len(new_ops) >= 100:
                         session.add_all(new_ops)
                         await session.commit()
                         new_ops = []
                         print(f"Committed {op_count} operations...")

                except Exception as e:
                    print(f"Error importing row: {e}")

            if new_ops:
                session.add_all(new_ops)
                await session.commit()
            
            f.close()
            print(f"Imported total {op_count} operations.")
        except FileNotFoundError:
             print("OPERASYON.CSV not found.")

        # 8. Import Hemogram (KAN.CSV) - Split Parameters
        print("Importing Hemogram (KAN.CSV)...")
        try:
            reader, f = get_csv_reader(os.path.join(CSV_DIR, "KAN.CSV"))
            new_hemos = []
            h_count = 0
            
            for row in reader:
                try:
                    hid_str = row.get("HastaRecID")
                    if not hid_str: continue
                    legacy_hid = int(hid_str)
                    
                    hid = legacy_id_map.get(legacy_hid)
                    if not hid: continue
                    
                    t_date = parse_date(row.get("Tarih"))
                    
                    # Define parameters map
                    params = [
                        ("Hemoglobin", "Hemoglobin (HGB)", "g/dL"),
                        ("Hematokrit", "Hematokrit (HCT)", "%"),
                        ("Lokosit", "Lökosit (WBC)", "10^3/uL"),
                        ("Trombosit", "Trombosit (PLT)", "10^3/uL")
                    ]
                    
                    for col, name, unit in params:
                        val = row.get(col)
                        if val:
                            if (hid, t_date, name) in existing_results: continue
                            
                            res = TetkikSonuc(
                                hasta_id=hid,
                                tarih=t_date,
                                kategori="Laboratuvar",
                                tetkik_adi=name,
                                sonuc=f"{val} {unit}",
                                sembol="info"
                            )
                            new_hemos.append(res)
                            existing_results.add((hid, t_date, name))

                    # Notes
                    if row.get("Notlar"):
                        name = "Hemogram Notu"
                        if (hid, t_date, name) not in existing_results:
                            res = TetkikSonuc(
                                hasta_id=hid,
                                tarih=t_date,
                                kategori="Laboratuvar",
                                tetkik_adi=name,
                                sonuc=clean_text(row.get("Notlar")),
                                sembol="info"
                            )
                            new_hemos.append(res)
                            existing_results.add((hid, t_date, name))

                    h_count += 1
                    
                    if len(new_hemos) >= 100:
                        session.add_all(new_hemos)
                        await session.commit()
                        new_hemos = []
                except Exception as e:
                    print(f"Error importing row: {e}")
            
            if new_hemos:
                session.add_all(new_hemos)
                await session.commit()
            
            f.close()
            print(f"Imported total {h_count} hemogram records (split).")
            
        except FileNotFoundError:
            print("KAN.CSV not found.")

        # 8.5 Import Urine (IDRAR.CSV)
        print("Importing Urine (IDRAR.CSV)...")
        try:
            reader, f = get_csv_reader(os.path.join(CSV_DIR, "IDRAR.CSV"))
            new_urine = []
            u_count = 0
            
            for row in reader:
                try:
                    hid_str = row.get("HastaRecID")
                    if not hid_str: continue
                    legacy_hid = int(hid_str)
                    
                    hid = legacy_id_map.get(legacy_hid)
                    if not hid: continue
                    
                    t_date = parse_date(row.get("Tarih"))
                    
                    # Parameters
                    u_params = [
                        ("Dansite", "İdrar - Dansite"),
                        ("pH", "İdrar - pH"),
                        ("Sediment", "İdrar - Sediment"),
                        ("Steril", "İdrar Kültürü"),
                        ("Koloni", "İdrar Kül. - Koloni"),
                        ("Bakteri", "İdrar Kül. - Bakteri"),
                        ("Antibiyogram", "İdrar Kül. - Antibiyogram")
                    ]
                    
                    for col, name in u_params:
                        val = clean_text(row.get(col))
                        if val:
                             if (hid, t_date, name) in existing_results: continue
                             res = TetkikSonuc(
                                hasta_id=hid,
                                tarih=t_date,
                                kategori="Laboratuvar",
                                tetkik_adi=name,
                                sonuc=val,
                                sembol="info"
                             )
                             new_urine.append(res)
                             existing_results.add((hid, t_date, name))
                    
                    if row.get("Notlar"):
                         name = "İdrar Notu"
                         if (hid, t_date, name) not in existing_results:
                             res = TetkikSonuc(
                                hasta_id=hid,
                                tarih=t_date,
                                kategori="Laboratuvar",
                                tetkik_adi=name,
                                sonuc=clean_text(row.get("Notlar")),
                                sembol="info"
                             )
                             new_urine.append(res)
                             existing_results.add((hid, t_date, name))
                    
                    u_count += 1
                    if len(new_urine) >= 100:
                        session.add_all(new_urine)
                        await session.commit()
                        new_urine = []

                except Exception as e:
                    print(f"Error importing row: {e}")

            if new_urine:
                 session.add_all(new_urine)
                 await session.commit()
            f.close()
            print(f"Imported total {u_count} urine records.")
            
        except FileNotFoundError:
            print("IDRAR.CSV not found.")

        # 9. Import Spermiogram (SPERM.CSV)
        print("Importing Spermiogram (SPERM.CSV)...")
        try:
            reader, f = get_csv_reader(os.path.join(CSV_DIR, "SPERM.CSV"))
            new_sperms = []
            s_count = 0
            
            for row in reader:
                try:
                    hid_str = row.get("HastaRecID")
                    if not hid_str: continue
                    legacy_hid = int(hid_str)
                    
                    hid = legacy_id_map.get(legacy_hid)
                    if not hid: continue
                    
                    t_date = parse_date(row.get("Tarih"))
                    t_name = "Spermiogram"
                    
                    if (hid, t_date, t_name) in existing_results:
                        continue
                     
                    # Construct Result String
                    res_parts = []
                    if row.get("Perhiz"): res_parts.append(f"Perhiz: {row.get('Perhiz')} gün")
                    if row.get("Volum"): res_parts.append(f"Volüm: {row.get('Volum')} cc")
                    if row.get("Sayi"): res_parts.append(f"Sayı: {row.get('Sayi')} /ml")
                    if row.get("Motilite"): res_parts.append(f"Motilite: {row.get('Motilite')}")
                    if row.get("Kruger"): res_parts.append(f"Kruger: {row.get('Kruger')}")
                    if row.get("Viskozite"): res_parts.append(f"Viskozite: {row.get('Viskozite')}")
                    if row.get("Aglutinasyon"): res_parts.append(f"Aglutinasyon: {row.get('Aglutinasyon')}")
                    if row.get("Notlar"): res_parts.append(f"Not: {clean_text(row.get('Notlar'))}")
                    
                    full_res = "\n".join(res_parts)
                    
                    res = TetkikSonuc(
                        hasta_id=hid,
                        tarih=t_date,
                        kategori="Laboratuvar",
                        tetkik_adi=t_name,
                        sonuc=full_res,
                        sembol="info"
                    )
                    new_sperms.append(res)
                    existing_results.add((hid, t_date, t_name))
                    s_count += 1
                    
                    if len(new_sperms) >= 100:
                        session.add_all(new_sperms)
                        await session.commit()
                        new_sperms = []
                        print(f"Committed {s_count} spermiograms...")
                except Exception as e:
                    print(f"Error importing row: {e}")
            
            if new_sperms:
                session.add_all(new_sperms)
                await session.commit()
            
            f.close()
            print(f"Imported total {s_count} spermiograms.")
            
        except FileNotFoundError:
            print("SPERM.CSV not found.")

        # 10. Import TRUS Biopsy (TRUS.CSV)
        print("Importing TRUS Biopsy (TRUS.CSV)...")
        try:
            reader, f = get_csv_reader(os.path.join(CSV_DIR, "TRUS.CSV"))
            new_trus = []
            trus_count = 0
            
            for row in reader:
                try:
                    hid_str = row.get("HastaRecID")
                    if not hid_str: continue
                    legacy_hid = int(hid_str)
                    
                    hid = legacy_id_map.get(legacy_hid)
                    if not hid: continue
                    
                    t_date = parse_date(row.get("Tarih"))
                    t_name = "TRUS / Prostat Biyopsi"
                    
                    if (hid, t_date, t_name) in existing_results:
                        continue
                     
                    # Construct Result String
                    res_parts = []
                    # Prostat Boyutları
                    px = row.get("Px")
                    py = row.get("Py")
                    pz = row.get("Pz")
                    if px or py or pz:
                        res_parts.append(f"Prostat Boyutları: {px or '-'} x {py or '-'} x {pz or '-'} mm")
                    
                    if row.get("TzVolume"): res_parts.append(f"TZ Volüm: {row.get('TzVolume')} cc")
                    if row.get("Bulgu"): res_parts.append(f"Bulgu: {clean_text(row.get('Bulgu'))}")
                    if row.get("Tani"): res_parts.append(f"Tanı: {clean_text(row.get('Tani'))}")
                    
                    # Biopsy Info
                    b_date = row.get("BTarih")
                    if b_date: res_parts.append(f"Biyopsi Tarihi: {b_date}")
                    
                    if row.get("BSay"): res_parts.append(f"Biyopsi Sayısı: {row.get('BSay')}")
                    if row.get("Patoloji"): res_parts.append(f"Patoloji: {clean_text(row.get('Patoloji'))}")
                    if row.get("Gleason"): res_parts.append(f"Gleason: {row.get('Gleason')}")

                    full_res = "\n".join(res_parts)
                    
                    res = TetkikSonuc(
                        hasta_id=hid,
                        tarih=t_date,
                        kategori="Goruntuleme",
                        tetkik_adi=t_name,
                        sonuc=full_res,
                        sembol="warning" if row.get("Patoloji") else "info"
                    )
                    new_trus.append(res)
                    existing_results.add((hid, t_date, t_name))
                    trus_count += 1
                    
                    if len(new_trus) >= 100:
                        session.add_all(new_trus)
                        await session.commit()
                        new_trus = []
                        print(f"Committed {trus_count} TRUS results...")
                except Exception as e:
                    print(f"Error importing row: {e}")
            
            if new_trus:
                session.add_all(new_trus)
                await session.commit()
            
            f.close()
            print(f"Imported total {trus_count} TRUS results.")
            
        except FileNotFoundError:
            print("TRUS.CSV not found.")

        # 11. Import Plans (PLAN.CSV)
        print("Importing Plans (PLAN.CSV)...")
        try:
            reader, f = get_csv_reader(os.path.join(CSV_DIR, "PLAN.CSV"))
            p_count = 0
            
            for row in reader:
                 hid_str = row.get("HastaRecID")
                 if not hid_str: continue
                 legacy_hid = int(hid_str)
                 hid = legacy_id_map.get(legacy_hid)
                 if not hid: continue
                 
                 rec_id = int(row.get("RecID") or 0)
                 
                 await session.execute(text("""
                    INSERT INTO planlar (id, hasta_id, tarih, tip, aciklama, yapildi, hatirlat)
                    VALUES (:id, :hasta_id, :tarih, :tip, :aciklama, :yapildi, :hatirlat)
                    ON CONFLICT (id) DO UPDATE SET aciklama=EXCLUDED.aciklama
                 """), {
                     'id': rec_id,
                     'hasta_id': hid,
                     'tarih': parse_date(row.get("Tarih")),
                     'tip': clean_text(row.get("Tip")),
                     'aciklama': clean_text(row.get("TipNot")),
                     'yapildi': clean_text(row.get("Uygulama")),
                     'hatirlat': clean_text(row.get("Remindme"))
                 })
                 p_count += 1
            f.close()
            await session.commit()
            print(f"Imported {p_count} plans.")
        except FileNotFoundError:
            print("PLAN.CSV not found.")

        # 12. Import Institutions (KURUM.CSV)
        print("Importing Institutions (KURUM.CSV)...")
        try:
            reader, f = get_csv_reader(os.path.join(CSV_DIR, "KURUM.CSV"))
            k_count = 0
            for row in reader:
                 rec_id = int(row.get("#") or 0)
                 if rec_id == 0: continue
                 ad = clean_text(row.get("KurumAd"))
                 if not ad: continue
                 
                 await session.execute(text("""
                    INSERT INTO kurumlar (id, ad, adres, vergi_dairesi, vergi_no, telefon, faks, yetkili, notlar)
                    VALUES (:id, :ad, :adres, :vergi_dairesi, :vergi_no, :telefon, :faks, :yetkili, :notlar)
                    ON CONFLICT (id) DO UPDATE SET ad=EXCLUDED.ad
                 """), {
                     'id': rec_id,
                     'ad': clean_text(row.get("KurumAd")),
                     'adres': f"{clean_text(row.get('Adres1') or '')} {clean_text(row.get('Adres2') or '')} {clean_text(row.get('Adres3') or '')}".strip(),
                     'vergi_dairesi': clean_text(row.get("VD")),
                     'vergi_no': clean_text(row.get("VDNO")),
                     'telefon': f"{clean_text(row.get('Telefon1') or '')} {clean_text(row.get('Telefon2') or '')}".strip(),
                     'faks': clean_text(row.get("Faks")),
                     'yetkili': f"{clean_text(row.get('Yetkili1') or '')} {clean_text(row.get('Yetkili2') or '')}".strip(),
                     'notlar': clean_text(row.get("Notlar"))
                 })
                 k_count += 1
            f.close()
            await session.commit()
            print(f"Imported {k_count} institutions.")
        except FileNotFoundError:
            print("KURUM.CSV not found.")

        # 13. Import Urodinami (URODINAMI.CSV)
        print("Importing Urodinami (URODINAMI.CSV)...")
        try:
            reader, f = get_csv_reader(os.path.join(CSV_DIR, "URODINAMI.CSV"))
            uro_count = 0
            for row in reader:
                 hid_str = row.get("HastaRecID")
                 if not hid_str: continue
                 legacy_hid = int(hid_str)
                 hid = legacy_id_map.get(legacy_hid)
                 if not hid: continue
                 
                 rec_id = int(row.get("RecID") or 0)

                 await session.execute(text("""
                    INSERT INTO urodinamiler (id, hasta_id, tarih, qmax, average_flow, voided_volume, residual_urine, sistometry, bac)
                    VALUES (:id, :hasta_id, :tarih, :qmax, :avg, :vol, :res, :sis, :bac)
                    ON CONFLICT (id) DO UPDATE SET qmax=EXCLUDED.qmax
                 """), {
                     'id': rec_id,
                     'hasta_id': hid,
                     'tarih': parse_date(row.get("Tarih")),
                     'qmax': float(row.get("QMax") or 0) if row.get("QMax") else None,
                     'avg': float(row.get("Ortalama") or 0) if row.get("Ortalama") else None,
                     'vol': float(row.get("Volume") or 0) if row.get("Volume") else None,
                     'res': float(row.get("Residuel") or 0) if row.get("Residuel") else None,
                     'sis': clean_text(row.get("Sistometry")),
                     'bac': clean_text(row.get("BAC"))
                 })
                 uro_count += 1
            f.close()
            await session.commit()
            print(f"Imported {uro_count} urodynamics.")
        except FileNotFoundError:
            print("URODINAMI.CSV not found.")

        # Reset Sequences
        tables = ['operasyonlar', 'muayeneler', 'planlar', 'urodinamiler', 'kurumlar', 'tetkik_sonuclari', 'hastalar']
        print("Resetting sequences...")
        for t in tables:
            try:
                await session.execute(text(f"SELECT setval('{t}_id_seq', COALESCE((SELECT MAX(id)+1 FROM {t}), 1), false)"))
                await session.commit()
            except Exception as e:
                 print(f"Warning: Could not reset sequence for {t}: {e}")


async def main():
    await update_schema()
    await import_data()

if __name__ == "__main__":
    asyncio.run(main())

