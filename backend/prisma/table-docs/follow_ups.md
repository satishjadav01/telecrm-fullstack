# follow_ups

## Purpose
Stores callback/reminder tasks for lead follow-up actions.

## Key Columns
- `id` (UUID, PK)
- `lead_id` (FK -> leads.id)
- `assigned_to` (FK -> users.id)
- `call_id` (optional FK -> calls.id)
- `due_at`, `reminder_at`
- `status` (`task_status` enum)
- `priority`

## Relations
- Belongs to one lead
- Belongs to one assignee
- Optional source call
- Has many notifications
