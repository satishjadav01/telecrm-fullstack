# call_recordings

## Purpose
Stores metadata for uploaded call recording files.

## Key Columns
- `id` (UUID, PK)
- `call_id` (unique FK -> calls.id)
- `lead_id` (FK -> leads.id)
- `agent_id` (FK -> users.id)
- `file_path`, `file_name`, `mime_type`, `file_size_bytes`
- `analysis_status` (`analysis_status` enum)
- `consent_captured`, `is_restricted`

## Relations
- One-to-one with call
- One-to-many with AI insights
- One-to-one with transcript
