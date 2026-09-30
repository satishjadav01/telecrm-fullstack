# notifications

## Purpose
Stores reminder/alert records and delivery state.

## Key Columns
- `id` (UUID, PK)
- `user_id` (FK -> users.id)
- `lead_id` (optional FK -> leads.id)
- `follow_up_id` (optional FK -> follow_ups.id)
- `channel` (`notification_channel` enum)
- `status` (`notification_status` enum: queued/sent/failed/read)
- `scheduled_at`, `sent_at`, `read_at`

## Relations
- Belongs to one user
- Optionally linked to lead and follow-up
