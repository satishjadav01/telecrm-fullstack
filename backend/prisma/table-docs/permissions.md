# permissions

## Purpose
Stores permission master records (example: `users.read`, `leads.write`).

## Key Columns
- `id` (UUID, PK)
- `code` (unique permission code)
- `name`

## Relations
- One permission has many role-permission mappings (`role_permissions`)
