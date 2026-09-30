# leads

## Purpose
Core CRM entity for customer/prospect records.

## Key Columns
- `id` (UUID, PK)
- `campaign_id` (FK -> campaigns.id)
- `assigned_to` (FK -> users.id)
- `created_by` (FK -> users.id)
- `phone_primary` (business unique in logic)
- `stage` (`lead_stage` enum)
- `priority`
- `next_follow_up_at`
- `is_active`

## Relations
- Has many calls
- Has many follow-ups
- Has many activities
- Has many recordings
- Has many notifications
