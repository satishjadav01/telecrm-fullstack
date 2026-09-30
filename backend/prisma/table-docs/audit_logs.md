# audit_logs

## Purpose
Stores audit records for important API mutations.

## Key Columns
- `id` (UUID, PK)
- `actor_user_id` (optional FK -> users.id)
- `entity_name`, `entity_id`
- `action` (POST/PUT/PATCH/DELETE etc.)
- `old_data`, `new_data` (JSON)
- `ip_address`, `user_agent`

## Relations
- Optional actor user relation for traceability
