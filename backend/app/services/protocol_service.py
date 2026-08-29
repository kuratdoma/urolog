from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import date
import json
import random

class ProtocolService:
    """
    Handles the generation of patient protocol numbers based on the year codes
    stored in the system settings. This abstracts the SRP violation away from
    the DemographicsRepository.
    """

    @staticmethod
    async def generate_protocol_number(session: AsyncSession) -> str:
        year = date.today().year
        year_str = str(year)
        last_digit = year_str[-1]

        # Get Year Code
        res = await session.execute(
            text("SELECT value FROM system_settings WHERE key = 'protocol_year_codes'")
        )
        row = res.first()
        year_codes = {}
        if row:
            try:
                year_codes = json.loads(row[0])
            except Exception:
                pass

        if year_str not in year_codes:
            ALLOWED_CHARS = [
                "A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L", "M", "N",
                "P", "R", "S", "T", "U", "V", "Y", "Z",
            ]
            c1, c2 = random.choice(ALLOWED_CHARS), random.choice(ALLOWED_CHARS)
            year_codes[year_str] = f"{c1}{c2}"
            await session.execute(
                text(
                    "INSERT INTO system_settings (key, value, description, is_deleted) VALUES ('protocol_year_codes', :val, 'Year mapping', false) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value"
                ),
                {"val": json.dumps(year_codes)},
            )
            # Reliance on the parent transaction context to commit if necessary

        code = year_codes[year_str]

        # Find Max Sequence for THIS Year (prefix: CODE + LAST_DIGIT)
        prefix = f"{code}{last_digit}"
        res_max = await session.execute(
            text(
                "SELECT MAX(CAST(SUBSTRING(protokol_no FROM 4) AS INTEGER)) FROM public.hastalar "
                "WHERE protokol_no LIKE :prefix || '%' AND LENGTH(protokol_no) >= 4"
            ),
            {"prefix": prefix},
        )
        max_seq = res_max.scalar() or 0
        next_seq = max_seq + 1

        # Format: CODE + Y + SEQ(padded to 4 digits)
        protocol_no = f"{code}{last_digit}{next_seq:04d}"
        
        return protocol_no
