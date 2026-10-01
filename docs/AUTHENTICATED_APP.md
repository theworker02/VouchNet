# Authenticated application

Implemented protected routes validate the session server-side through `getCurrentActor`; a cookie
existing in the browser is insufficient. Invalid or absent sessions redirect through the shell to
`/login`.

Implemented product routes include `/home`, `/network`, `/network/discover`, `/search`,
`/in/[slug]`, `/onboarding`, `/feed`, `/jobs`, `/jobs/tracker`, `/notifications`, `/games`,
`/projects`, `/saved`, and `/settings`. The messaging route remains deliberately unavailable until
conversation persistence, membership authorization, delivery, and abuse controls are complete; it
does not display fabricated records.

The avatar menu links to the real profile, projects, saved items, settings, and the real POST logout
route. The protected shell includes responsive primary navigation, an accessible keyboard skip link,
route-level loading skeletons, error boundaries, and a daily-notification badge. Daily notification
materialization and the unread count share one database lifecycle per authenticated shell render.
