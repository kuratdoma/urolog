from typing import Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_, text

from app.models.system import ICDTani
from app.schemas.system import ICDTaniCreate


class SystemRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    # Türkçe karakterleri normalize eden SQL ifadesi. p011 migration'ındaki
    # ifade indeksi ile BİREBİR aynı olmalı, aksi halde indeks kullanılmaz.
    ICD_NORMALIZE_SQL = "lower(translate(adi, 'ıİğĞüÜşŞöÖçÇ', 'iigguussoocc'))"
    # Python tarafındaki karşılığı — sorgu metnine aynı dönüşüm uygulanır.
    _TR_TRANSLATION = str.maketrans("ıİğĞüÜşŞöÖçÇ", "iigguussoocc")

    # Muayene ekranındaki otomatik tamamlama için minimum sorgu uzunluğu.
    # Tek karakterlik sorgular binlerce satır döndürür ve trigram indeksi
    # devreye girmez — istemci de zaten 2 karakterden önce arama yapmıyor.
    ICD_SEARCH_MIN_LENGTH = 2
    # pg_trgm `%` operatörü kısa metinlerde çok gürültülü; benzerlik aramasını
    # yalnızca anlamlı uzunluktaki sorgularda açıyoruz.
    ICD_TRIGRAM_MIN_LENGTH = 4

    async def search_icd(
        self, query: Optional[str] = None, skip: int = 0, limit: int = 50
    ) -> List[ICDTani]:
        stmt = select(ICDTani)
        if query:
            stmt = stmt.where(
                or_(ICDTani.kodu.ilike(f"{query}%"), ICDTani.adi.ilike(f"%{query}%"))
            )
        stmt = stmt.order_by(ICDTani.kodu).offset(skip).limit(limit)

        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def search_icd_ranked(
        self, query: str, limit: int = 20
    ) -> List[Dict[str, str]]:
        """
        Muayene ekranı otomatik tamamlaması için alaka düzeyine göre sıralı ICD
        araması. Sıralama kademesi eski in-memory servisin davranışını korur:
        tam kod > kod öneki > isimde geçen > trigram benzerliği.

        p008 migration'ındaki GIN trigram indeksleri hem ILIKE '%...%' hem de
        `%` benzerlik operatörü tarafından kullanılır.
        """
        normalized = (query or "").strip()
        if len(normalized) < self.ICD_SEARCH_MIN_LENGTH:
            return []

        use_trigram = len(normalized) >= self.ICD_TRIGRAM_MIN_LENGTH

        # Sorgu metni de kolonla aynı şekilde normalize edilir; böylece
        # "uriner" yazan hekim "Üriner ..." tanılarını da bulur.
        normalized_q = normalized.translate(self._TR_TRANSLATION).lower()
        # WHERE/CASE içinde ifade indeksle BİREBİR aynı yazılmalı — COALESCE
        # gibi bir sarmalayıcı planner'ın indeksi kullanmasını engelliyor.
        # adi NULL ise LIKE de NULL döner ve satır zaten elenir.
        adi_norm = self.ICD_NORMALIZE_SQL

        sql = text(
            f"""
            SELECT kodu, adi
            FROM icd_tanilar
            WHERE COALESCE(is_deleted, FALSE) = FALSE
              AND (
                    kodu ILIKE :prefix
                 OR {adi_norm} LIKE :contains
                 OR (:use_trigram AND {adi_norm} % :q_norm)
              )
            ORDER BY
              CASE
                WHEN upper(kodu) = upper(:q) THEN 0
                WHEN kodu ILIKE :prefix THEN 1
                WHEN {adi_norm} LIKE :contains THEN 2
                ELSE 3
              END,
              similarity(COALESCE({adi_norm}, ''), :q_norm) DESC,
              kodu
            LIMIT :limit
            """
        )

        result = await self.db.execute(
            sql,
            {
                "q": normalized,
                "q_norm": normalized_q,
                "prefix": f"{normalized}%",
                "contains": f"%{normalized_q}%",
                "use_trigram": use_trigram,
                "limit": limit,
            },
        )
        return [{"kodu": row.kodu, "adi": row.adi or ""} for row in result]

    async def lookup_icd_names(self, codes: List[str]) -> Dict[str, Optional[str]]:
        """
        Verilen ICD kodlarının adlarını tek sorguda çözümler. Bulunamayan kod
        için None döner — kodun kendisini "ad" gibi geri döndürmek rapor/PDF
        çıktısına sahte veri sızdırdığı için bilinçli olarak yapılmıyor.
        """
        unique_codes = {c.strip().upper() for c in codes if c and c.strip()}
        if not unique_codes:
            return {}

        stmt = select(ICDTani.kodu, ICDTani.adi).where(
            func.upper(ICDTani.kodu).in_(unique_codes)
        )
        result = await self.db.execute(stmt)
        found = {row.kodu.upper(): row.adi for row in result}
        return {code: found.get(code) for code in unique_codes}

    async def get_icd_by_code(self, code: str) -> Optional[ICDTani]:
        result = await self.db.execute(select(ICDTani).filter(ICDTani.kodu == code))
        return result.scalars().first()

    async def create_icd(self, obj_in: ICDTaniCreate) -> ICDTani:
        db_obj = ICDTani(
            kodu=obj_in.kodu,
            adi=obj_in.adi,
            ust_kodu=obj_in.ust_kodu,
            aktif=obj_in.aktif or "1",
            seviye=obj_in.seviye or "2",
        )
        self.db.add(db_obj)
        await self.db.flush()
        await self.db.refresh(db_obj)
        return db_obj

    async def delete_icds(self, ids: List[int]) -> bool:
        from sqlalchemy import delete

        stmt = delete(ICDTani).where(ICDTani.id.in_(ids))
        await self.db.execute(stmt)
        await self.db.flush()
        return True

    async def search_drugs(
        self, query: Optional[str] = None, skip: int = 0, limit: int = 50
    ):
        from app.models.system import IlacTanim
        from sqlalchemy import or_, select

        stmt = select(IlacTanim)
        if query:
            query = query.strip()
            # Alternatif sorgular oluştur (Türkçe karakter sorunlarını aşmak için)
            # Postgres ilike bazen i/İ ve ı/I eşleşmelerinde sorun yaşayabiliyor locale ayarına göre
            q_lower = query.lower()
            q_upper = query.upper()

            # Türkçe karakter mappingleri
            q_tr_upper = query.replace("i", "İ").replace("ı", "I").upper()
            q_tr_lower = query.replace("İ", "i").replace("I", "ı").lower()

            stmt = stmt.where(
                or_(
                    IlacTanim.name.ilike(f"%{query}%"),
                    IlacTanim.name.ilike(f"%{q_lower}%"),
                    IlacTanim.name.ilike(f"%{q_upper}%"),
                    IlacTanim.name.ilike(f"%{q_tr_upper}%"),
                    IlacTanim.name.ilike(f"%{q_tr_lower}%"),
                    IlacTanim.barcode.ilike(f"%{query}%"),
                    IlacTanim.etkin_madde.ilike(f"%{query}%"),
                    IlacTanim.etkin_madde.ilike(f"%{q_tr_upper}%"),
                )
            )
        stmt = stmt.order_by(IlacTanim.name).offset(skip).limit(limit)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def create_drug(self, obj_in):
        from app.models.system import IlacTanim

        db_obj = IlacTanim(
            name=obj_in.name,
            barcode=obj_in.barcode,
            etkin_madde=obj_in.etkin_madde,
            atc_kodu=obj_in.atc_kodu,
            fiyat=obj_in.fiyat,
            firma=obj_in.firma,
            recete_tipi=obj_in.recete_tipi,
            aktif=obj_in.aktif,
        )
        self.db.add(db_obj)
        await self.db.flush()
        await self.db.refresh(db_obj)
        return db_obj

    async def delete_all_drugs(self):
        from app.models.system import IlacTanim
        from sqlalchemy import delete

        stmt = delete(IlacTanim)
        await self.db.execute(stmt)
        await self.db.flush()

    async def batch_create_drugs(self, drugs_data: List[dict]):
        from app.models.system import IlacTanim
        from sqlalchemy import insert

        if not drugs_data:
            return 0

        # Optimize with Core Insert
        # Chunking might be necessary if too large, but 10k is usually fine for one statement
        # SQLite has variable limit, Postgres is fine.
        # Let's chunk it safely to 1000

        CHUNK_SIZE = 1000
        total = 0

        for i in range(0, len(drugs_data), CHUNK_SIZE):
            chunk = drugs_data[i : i + CHUNK_SIZE]
            stmt = insert(IlacTanim).values(chunk)
            await self.db.execute(stmt)
            total += len(chunk)

        await self.db.flush()
        return total

    async def import_drugs_from_file(self, file_path: str) -> int:
        import pandas as pd
        import io
        import os

        # Check extension
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".csv":
            # Try multiple separators and encodings
            df = None
            encodings = ["utf-8", "windows-1254", "iso-8859-9"]
            separators = [";", ",", "\t"]
            for encoding in encodings:
                for sep in separators:
                    try:
                        temp_df = pd.read_csv(file_path, sep=sep, encoding=encoding)
                        if len(temp_df.columns) > 1:
                            df = temp_df
                            break
                    except:
                        continue
                if df is not None:
                    break
            if df is None:
                df = pd.read_csv(file_path, sep=None, engine="python")
        else:
            df = pd.read_excel(file_path)

        # Normalize columns (this logic should ideally be shared with the endpoint)
        column_map = {
            "İlaç Adı": "name",
            "Piyasa Adı": "name",
            "Adı": "name",
            "Barkod": "barcode",
            "Barkodu": "barcode",
            "Etkin Madde": "etkin_madde",
            "ATC Kodu": "atc_kodu",
            "ATC": "atc_kodu",
            "Firma": "firma",
            "Firma Adı": "firma",
            "Fiyat": "fiyat",
            "Reçete Tipi": "recete_tipi",
            "Reçete Türü": "recete_tipi",
        }
        df = df.rename(columns=column_map)
        if "name" not in df.columns:
            df["name"] = df.iloc[:, 0]
        df = df.fillna("")

        drugs_data = []
        for _, row in df.iterrows():
            name = str(row.get("name", "")).strip()
            if not name:
                continue
            drug = {
                "name": name,
                "barcode": str(row.get("barcode", "")).strip() if row.get("barcode") else None,
                "etkin_madde": str(row.get("etkin_madde", "")).strip() if row.get("etkin_madde") else None,
                "atc_kodu": str(row.get("atc_kodu", "")).strip() if row.get("atc_kodu") else None,
                "firma": str(row.get("firma", "")).strip() if row.get("firma") else None,
                "fiyat": str(row.get("fiyat", "")).strip() if row.get("fiyat") else None,
                "recete_tipi": str(row.get("recete_tipi", "")).strip() if row.get("recete_tipi") else "Normal",
                "aktif": True,
            }
            drugs_data.append(drug)

        await self.delete_all_drugs()
        return await self.batch_create_drugs(drugs_data)
