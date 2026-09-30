# Authenticated application

Implemented protected routes validate the session server-side through `getCurrentActor`; a cookie
existing in the browser is insufficient. Invalid or absent sessions redirect through the shell to
`/login`.

Implemented product routes are `/home`, `/network`, `/network/discover`, `/search`, `/in/[slug]`,
and `/onboarding`. `/explore`, `/jobs`, `/messaging`, `/notifications`, `/games`, `/projects`,
`/saved`, and `/settings` use the same protected shell but explicitly state when their underlying
product feature is unavailable. They do not display fabricated records.

The avatar menu links to the real profile, projects, saved items, settings, and the real POST logout
route. A full visual account menu, mobile navigation, route-level loading skeletons, and error
boundaries remain planned.
