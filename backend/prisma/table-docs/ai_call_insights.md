# ai_call_insights

## Purpose
Stores AI-derived call analysis results.

## Key Columns
- `id` (UUID, PK)
- `recording_id` (FK -> call_recordings.id)
- `summary`
- `sentiment_label`, `sentiment_score`
- `intent_label`
- `compliance_score`
- `risk_flags` (JSON)
- `action_items` (JSON)

## Relations
- Belongs to one recording
- Multiple insight versions per recording are possible
