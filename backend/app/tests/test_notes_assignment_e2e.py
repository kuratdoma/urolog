import asyncio
from datetime import datetime, time, timezone
from app.db.session import SessionLocal
from app.models.user import User
from app.models.personal_note import AssignmentStatus, NoteColor, RecurrenceType
from app.services.personal_note_service import PersonalNoteService
from sqlalchemy import select


async def run_verification():
    async with SessionLocal() as db:
        service = PersonalNoteService(db)

        # 1. Fetch users
        users_stmt = select(User).limit(2)
        res = await db.execute(users_stmt)
        users = list(res.scalars().all())
        if len(users) < 2:
            print("Need at least 2 users to test delegation")
            return

        user_a = users[0]
        user_b = users[1]
        print(f"User A: {user_a.username} (id: {user_a.id}), User B: {user_b.username} (id: {user_b.id})")

        # 2. Test create note with @mention in content
        note_data_mention = {
            "title": "Konsültasyon Raporu İncelemesi",
            "content": f"Lütfen hastanın dosyasını kontrol et @{user_b.username}",
            "color": NoteColor.red,
            "recurrence_type": RecurrenceType.once,
            "interval": 1,
            "time_of_day": time(14, 0),
            "starts_at": datetime.now(timezone.utc),
        }
        note_created = await service.create_note(user_a, note_data_mention)
        print(f"Created Note ID: {note_created.id}")
        assert note_created.assigned_to_id == user_b.id, f"Expected assigned_to_id={user_b.id}, got {note_created.assigned_to_id}"
        assert note_created.assignment_status == AssignmentStatus.pending, f"Expected pending, got {note_created.assignment_status}"
        print("✓ @mention assignment successful!")

        # 3. Check pending assignments for User B
        pending_b = await service.get_pending_assignments(user_b)
        pending_ids = [n.id for n in pending_b]
        assert note_created.id in pending_ids, f"Note {note_created.id} not found in user B pending list"
        print("✓ User B has pending assignment in list!")

        # 4. User B accepts the assignment
        accepted_note = await service.accept_assignment(user_b, note_created.id, datetime.now(timezone.utc))
        assert accepted_note is not None
        assert accepted_note.assignment_status == AssignmentStatus.accepted
        print("✓ User B successfully accepted the assignment!")

        # 5. User B pending assignments should no longer contain this note
        pending_b_after = await service.get_pending_assignments(user_b)
        assert note_created.id not in [n.id for n in pending_b_after]
        print("✓ Note cleared from pending list after acceptance!")

        # 6. Test direct assignment and reject
        note_data_direct = {
            "title": "Lab Sonuç Takibi",
            "content": "Laboratuvar tetkiklerini kontrol et",
            "assigned_to_id": user_b.id,
            "color": NoteColor.blue,
            "recurrence_type": RecurrenceType.once,
            "interval": 1,
            "time_of_day": time(16, 0),
            "starts_at": datetime.now(timezone.utc),
        }
        note_2 = await service.create_note(user_a, note_data_direct)
        assert note_2.assignment_status == AssignmentStatus.pending

        # User B rejects with reason
        rejected_note = await service.reject_assignment(
            user_b, note_2.id, "Nöbette değilim", datetime.now(timezone.utc)
        )
        assert rejected_note is not None
        assert rejected_note.assignment_status == AssignmentStatus.rejected
        assert rejected_note.rejection_reason == "Nöbette değilim"
        print("✓ User B successfully rejected the task with reason!")

        # 7. Clean up test notes
        await db.delete(note_created)
        await db.delete(note_2)
        await db.commit()
        print("✓ Test notes cleaned up successfully!")
        print("\nALL VERIFICATION CHECKS PASSED!")


if __name__ == "__main__":
    asyncio.run(run_verification())
