# Authenticated application

Implemented protected routes validate the session server-side through `getCurrentActor`; a cookie
existing in the browser is insufficient. Invalid or absent sessions redirect through the shell to
`/login`.

Implemented product routes include `/home`, `/network`, `/network/discover`, `/search`,
`/in/[slug]`, `/onboarding`, `/feed`, `/messaging`, `/saved`, `/jobs`, `/jobs/tracker`,
`/notifications`, `/games`, `/projects`, `/discover`, `/opportunities`, and `/settings`.

Messaging is a real vertical slice: conversation persistence, membership authorization, delivery
and seen markers, and the Desktop device-token routes. Saved posts are private to the member who
saved them and re-check visibility and block rules on every read.

The avatar menu links to the real profile, projects, saved items, settings, and the real POST logout
route. The protected shell includes responsive primary navigation, an accessible keyboard skip link,
route-level loading skeletons, error boundaries, and a daily-notification badge. Daily notification
materialization and the unread count share one database lifecycle per authenticated shell render.
Members can mark one notification or all unread notifications as read from `/notifications`.
