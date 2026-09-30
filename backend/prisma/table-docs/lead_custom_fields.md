# lead_custom_fields

## Purpose
Stores dynamic key-value fields per lead.

## Key Columns
- `id` (UUID, PK)
- `lead_id` (FK -> leads.id)
- `field_key`
- `field_value`
- Unique: (`lead_id`, `field_key`)

## Relations
- Belongs to one lead
