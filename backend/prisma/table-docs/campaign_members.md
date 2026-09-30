# campaign_members

## Purpose
Join table linking leads to campaigns.

## Key Columns
- `campaign_id` (FK -> campaigns.id)
- `lead_id` (FK -> leads.id)
- Composite PK: (`campaign_id`, `lead_id`)

## Relations
- Many-to-many bridge between campaigns and leads
