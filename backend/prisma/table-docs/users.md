# users

## Purpose
Stores system users (admin, manager, team leads, agents).

## Key Columns
- `id` (UUID, PK)
- `role_id` (FK -> roles.id)
- `full_name`
- `email` (unique, nullable)
- `phone` (unique, nullable)
- `password_hash`
- `is_active`
- `last_login_at`

## Relations
- Belongs to one role
- Can create campaigns/leads/follow-ups
- Can be assignee for leads/follow-ups
- Can be actor in audit logs and lead activities
