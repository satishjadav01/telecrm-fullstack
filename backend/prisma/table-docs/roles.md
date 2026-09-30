# roles

## Purpose
Stores user role master records (admin, manager, team_lead, agent).

## Key Columns
- `id` (UUID, PK)
- `code` (unique role code)
- `name` (display name)
- `is_active`

## Relations
- One role has many users (`users`)
- One role has many role-permission mappings (`role_permissions`)
