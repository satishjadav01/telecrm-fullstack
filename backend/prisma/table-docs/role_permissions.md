# role_permissions

## Purpose
Join table between roles and permissions (RBAC mapping).

## Key Columns
- `role_id` (FK -> roles.id)
- `permission_id` (FK -> permissions.id)
- Composite PK: (`role_id`, `permission_id`)

## Relations
- Maps many permissions to many roles
