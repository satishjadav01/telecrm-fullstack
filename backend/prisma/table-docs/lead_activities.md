# lead_activities

## Purpose
Timeline/audit style log for lead changes and actions.

## Key Columns
- `id` (UUID, PK)
- `lead_id` (FK -> leads.id)
- `actor_user_id` (FK -> users.id)
- `activity_type`
- `old_value` (JSON)
- `new_value` (JSON)
- `note`

## Relations
- Belongs to one lead
- Optional actor user
