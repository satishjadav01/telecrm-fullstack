# call_transcripts

## Purpose
Stores transcript output for a recording (future AI pipeline).

## Key Columns
- `id` (UUID, PK)
- `recording_id` (unique FK -> call_recordings.id)
- `transcript_text`
- `transcript_json`
- `language_code`
- `model_name`

## Relations
- Belongs to one recording
