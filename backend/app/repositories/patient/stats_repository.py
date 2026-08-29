"""
Patient Stats Repository — Performance Optimized.

Provides record count statistics for patients using optimized single-query
patterns instead of multiple sequential round-trips.

Complexity:
  - get_counts:       O(1) DB round-trip (scalar subqueries)
  - get_counts_batch: O(1) DB round-trip (single UNION ALL)
"""
from typing import Optional, Dict, List
from uuid import UUID
from sqlalchemy import select, func, and_, union_all, literal, cast, String
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.clinical.models import (
    Muayene,
    Operasyon,
    KlinikNot,
    TetkikSonuc,
    FotografArsivi,
)
from app.models.documents import HastaDosya
from app.core.user_context import UserContext


class PatientStatsRepository:
    def __init__(self, session: AsyncSession, context: Optional[UserContext] = None):
        self.session = session
        self.context = context

    async def get_counts(self, patient_id: UUID) -> Dict[str, int]:
        """Get record counts for various clinical categories for a patient using subqueries in a single call."""
        try:
            # Single query using scalar subqueries (already optimized)
            stmt = select(
                select(func.count(Muayene.id))
                .where(and_(Muayene.hasta_id == patient_id, Muayene.is_deleted == False))
                .scalar_subquery()
                .label("muayene"),
                select(func.count(TetkikSonuc.id))
                .where(
                    and_(
                        TetkikSonuc.hasta_id == patient_id,
                        TetkikSonuc.is_deleted == False,
                        TetkikSonuc.kategori == "Goruntuleme",
                    )
                )
                .scalar_subquery()
                .label("imaging"),
                select(func.count(Operasyon.id))
                .where(and_(Operasyon.hasta_id == patient_id, Operasyon.is_deleted == False))
                .scalar_subquery()
                .label("operation"),
                select(func.count(KlinikNot.id))
                .where(and_(KlinikNot.hasta_id == patient_id, KlinikNot.is_deleted == False))
                .scalar_subquery()
                .label("followup"),
                select(func.count(HastaDosya.id))
                .where(and_(HastaDosya.hasta_id == patient_id, HastaDosya.is_deleted == False))
                .scalar_subquery()
                .label("document"),
                select(func.count(FotografArsivi.id))
                .where(and_(FotografArsivi.hasta_id == patient_id, FotografArsivi.is_deleted == False))
                .scalar_subquery()
                .label("photo"),
            )

            res = await self.session.execute(stmt)
            row = res.fetchone()

            return {
                "muayene": row.muayene or 0,
                "imaging": row.imaging or 0,
                "operation": row.operation or 0,
                "followup": row.followup or 0,
                "document": row.document or 0,
                "photo": row.photo or 0,
            }
        except Exception:
            import traceback

            traceback.print_exc()
            return {
                "muayene": 0,
                "imaging": 0,
                "operation": 0,
                "followup": 0,
                "document": 0,
                "photo": 0,
            }

    async def get_counts_batch(
        self, patient_ids: List[UUID]
    ) -> Dict[UUID, Dict[str, int]]:
        """
        Fetch clinical record counts for multiple patients in bulk.
        
        Performance: Uses a single UNION ALL query instead of 6 sequential queries.
        Reduces DB round-trips from 6 to 1.
        Resilient: missing tables degrade gracefully to zero counts.
        """
        if not patient_ids:
            return {}

        try:
            return await self._batch_counts_union(patient_ids)
        except Exception as e:
            err_str = str(e).lower()
            if "undefinedtable" in err_str or "does not exist" in err_str:
                import logging
                logging.getLogger(__name__).warning(
                    f"[STATS] Table missing in batch counts, falling back to sequential: {e}"
                )
                await self.session.rollback()
                return await self._batch_counts_sequential(patient_ids)
            raise

    async def _batch_counts_union(
        self, patient_ids: List[UUID]
    ) -> Dict[UUID, Dict[str, int]]:
        """
        Single UNION ALL query that fetches all 6 count types at once.
        
        SQL equivalent:
          SELECT hasta_id, 'muayene' as entity, COUNT(*) as cnt 
            FROM muayeneler WHERE hasta_id IN (...) AND is_deleted=false GROUP BY hasta_id
          UNION ALL
          SELECT hasta_id, 'imaging', COUNT(*) FROM tetkikler WHERE ... AND kategori='Goruntuleme' GROUP BY hasta_id
          UNION ALL ...
        """
        # Muayene counts
        q_mu = (
            select(
                Muayene.hasta_id.label("hasta_id"),
                literal("muayene").label("entity"),
                func.count(Muayene.id).label("cnt"),
            )
            .where(and_(Muayene.hasta_id.in_(patient_ids), Muayene.is_deleted == False))
            .group_by(Muayene.hasta_id)
        )

        # Imaging counts (TetkikSonuc where kategori == 'Goruntuleme')
        q_im = (
            select(
                TetkikSonuc.hasta_id.label("hasta_id"),
                literal("imaging").label("entity"),
                func.count(TetkikSonuc.id).label("cnt"),
            )
            .where(
                and_(
                    TetkikSonuc.hasta_id.in_(patient_ids),
                    TetkikSonuc.is_deleted == False,
                    TetkikSonuc.kategori == "Goruntuleme",
                )
            )
            .group_by(TetkikSonuc.hasta_id)
        )

        # Operation counts
        q_op = (
            select(
                Operasyon.hasta_id.label("hasta_id"),
                literal("operation").label("entity"),
                func.count(Operasyon.id).label("cnt"),
            )
            .where(and_(Operasyon.hasta_id.in_(patient_ids), Operasyon.is_deleted == False))
            .group_by(Operasyon.hasta_id)
        )

        # Followup (KlinikNot) counts
        q_nt = (
            select(
                KlinikNot.hasta_id.label("hasta_id"),
                literal("followup").label("entity"),
                func.count(KlinikNot.id).label("cnt"),
            )
            .where(and_(KlinikNot.hasta_id.in_(patient_ids), KlinikNot.is_deleted == False))
            .group_by(KlinikNot.hasta_id)
        )

        # Document counts
        q_doc = (
            select(
                HastaDosya.hasta_id.label("hasta_id"),
                literal("document").label("entity"),
                func.count(HastaDosya.id).label("cnt"),
            )
            .where(and_(HastaDosya.hasta_id.in_(patient_ids), HastaDosya.is_deleted == False))
            .group_by(HastaDosya.hasta_id)
        )

        # Photo counts
        q_ph = (
            select(
                FotografArsivi.hasta_id.label("hasta_id"),
                literal("photo").label("entity"),
                func.count(FotografArsivi.id).label("cnt"),
            )
            .where(and_(FotografArsivi.hasta_id.in_(patient_ids), FotografArsivi.is_deleted == False))
            .group_by(FotografArsivi.hasta_id)
        )

        # Execute single UNION ALL
        combined = union_all(q_mu, q_im, q_op, q_nt, q_doc, q_ph)
        result = await self.session.execute(combined)

        # Pivot results into per-patient dict
        batch_results: Dict[UUID, Dict[str, int]] = {
            pid: {"muayene": 0, "imaging": 0, "operation": 0, "followup": 0, "document": 0, "photo": 0}
            for pid in patient_ids
        }

        for row in result.all():
            hasta_id, entity, cnt = row
            if hasta_id in batch_results:
                batch_results[hasta_id][entity] = cnt

        return batch_results

    async def _batch_counts_sequential(
        self, patient_ids: List[UUID]
    ) -> Dict[UUID, Dict[str, int]]:
        """
        Fallback: sequential count queries for resilience when tables are missing.
        Preserves original behavior with table-missing safety.
        """
        empty_map: Dict[UUID, int] = {}

        async def fetch_counts_safe(model, label: str) -> Dict[UUID, int]:
            try:
                stmt = (
                    select(model.hasta_id, func.count(model.id).label("cnt"))
                    .where(
                        and_(
                            model.hasta_id.in_(patient_ids),
                            getattr(model, "is_deleted", False) == False,
                        )
                    )
                    .group_by(model.hasta_id)
                )
                res = await self.session.execute(stmt)
                return {row.hasta_id: row.cnt for row in res.all()}
            except Exception as e:
                err_str = str(e).lower()
                if "undefinedtable" in err_str or "does not exist" in err_str:
                    print(f"[STATS] Table missing for {label}, returning zeros: {e}")
                    await self.session.rollback()
                    return empty_map
                raise

        mu_map = await fetch_counts_safe(Muayene, "muayene")

        try:
            imaging_stmt = (
                select(
                    TetkikSonuc.hasta_id,
                    func.count(TetkikSonuc.id).label("cnt"),
                )
                .where(
                    and_(
                        TetkikSonuc.hasta_id.in_(patient_ids),
                        TetkikSonuc.is_deleted == False,
                        TetkikSonuc.kategori == "Goruntuleme",
                    )
                )
                .group_by(TetkikSonuc.hasta_id)
            )
            res_im = await self.session.execute(imaging_stmt)
            im_map = {row.hasta_id: row.cnt for row in res_im.all()}
        except Exception as e:
            err_str = str(e).lower()
            if "undefinedtable" in err_str or "does not exist" in err_str:
                print(f"[STATS] Table missing for imaging, returning zeros: {e}")
                await self.session.rollback()
                im_map = empty_map
            else:
                raise

        op_map = await fetch_counts_safe(Operasyon, "operation")
        nt_map = await fetch_counts_safe(KlinikNot, "followup")

        try:
            doc_stmt = (
                select(HastaDosya.hasta_id, func.count(HastaDosya.id).label("cnt"))
                .where(HastaDosya.hasta_id.in_(patient_ids))
                .group_by(HastaDosya.hasta_id)
            )
            res_dc = await self.session.execute(doc_stmt)
            dc_map = {row.hasta_id: row.cnt for row in res_dc.all()}
        except Exception as e:
            err_str = str(e).lower()
            if "undefinedtable" in err_str or "does not exist" in err_str:
                print(f"[STATS] Table missing for documents, returning zeros: {e}")
                await self.session.rollback()
                dc_map = empty_map
            else:
                raise

        ph_map = await fetch_counts_safe(FotografArsivi, "photo")

        batch_results = {}
        for pid in patient_ids:
            batch_results[pid] = {
                "muayene": mu_map.get(pid, 0),
                "imaging": im_map.get(pid, 0),
                "operation": op_map.get(pid, 0),
                "followup": nt_map.get(pid, 0),
                "document": dc_map.get(pid, 0),
                "photo": ph_map.get(pid, 0),
            }
        return batch_results
