# calls

## Purpose
Stores call lifecycle events for a lead.

## Key Columns
- `id` (UUID, PK)
- `lead_id` (FK -> leads.id)
- `agent_id` (FK -> users.id)
- `direction` (`call_direction` enum)
- `disposition` (`call_disposition` enum)
- `started_at`, `ended_at`, `duration_seconds`
- `follow_up_required`, `follow_up_at`

## Relations
- Belongs to one lead and one agent
- Has one recording (optional)
- Can have many follow-ups
