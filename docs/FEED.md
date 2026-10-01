# Feed

## Current implementation (PARTIAL)

VouchNet now has a PostgreSQL-backed post and feed foundation. Posts preserve Markdown source,
structured code snippets, media URL references, visibility, feed category, and structured user
mentions. The feed supports an unfiltered chronological order plus a peer-verified signal mode that
weights reactions from accepted Contacts. Viewers can locally hide categories such as hiring or
opinion content.

Visibility and blocks are evaluated in the feed query. Persisted reactions are `LIKE`, `LOVE`,
`JOY`, `SURPRISED`, `UPVOTE`, `VERIFY`, `INSIGHTFUL`, and `BENCHMARK`; Verify and Benchmark
create aggregated peer-endorsement events. The reaction picker is keyboard-accessible, closes after
a selection, and reverts optimistic UI state if persistence fails. Quote posts require at least 80
characters server-side.

Comments, project/organization mentions, cursor pagination, safe rich Markdown/LaTeX rendering,
media ingestion, post editing/deletion, feed tests, and PostgreSQL integration verification remain
incomplete. A failed feed refresh presents an actionable status and successful refreshes clear that
status rather than leaving stale failure messaging on screen.
