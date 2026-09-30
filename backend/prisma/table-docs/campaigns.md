# campaigns

## Purpose
Stores outbound campaign metadata.

## Key Columns
- `id` (UUID, PK)
- `name`
- `description`
- `is_active`
- `starts_on`, `ends_on`
- `created_by` (FK -> users.id)

## Relations
- One campaign has many leads
- Many-to-many with leads through `campaign_members`
