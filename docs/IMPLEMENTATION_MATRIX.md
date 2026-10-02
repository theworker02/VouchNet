# Implementation matrix

This is a reality audit as of Phase 5 work. A feature is only **COMPLETE** when its database,
service, authorization, API, UI, error/empty states, and tests form a usable vertical slice.

| Feature                         | Database               | Repository         | Domain service      | Authorization                             | API                     | UI                              | Tests                | Status  |
| ------------------------------- | ---------------------- | ------------------ | ------------------- | ----------------------------------------- | ----------------------- | ------------------------------- | -------------------- | ------- |
| Email/password identity         | partial                | partial            | partial             | partial                                   | partial                 | partial                         | partial              | PARTIAL |
| Server sessions                 | partial                | partial            | partial             | partial                                   | partial                 | partial                         | partial              | PARTIAL |
| Email verification              | partial                | partial            | partial             | partial                                   | partial                 | local development only          | partial              | PARTIAL |
| Authenticated application shell | n/a                    | n/a                | current-user query  | server session check                      | n/a                     | protected routes                | none                 | PARTIAL |
| Onboarding basics               | partial                | partial            | partial             | owner-only                                | partial                 | headline/location/about editor  | none                 | PARTIAL |
| Professional profile read       | partial                | inline SQL         | partial             | public visibility/block checks            | badge SVG read route    | public `/in/[slug]`             | none                 | PARTIAL |
| Professional profile editing    | partial                | partial            | partial             | owner-only + same-origin                  | PATCH `/api/profile/me` | onboarding editor               | none                 | PARTIAL |
| Follow/unfollow                 | complete               | inline SQL         | partial             | human session + block checks              | partial                 | profile action                  | unit only            | PARTIAL |
| Contact requests                | complete               | inline SQL         | partial             | human session + recipient-only acceptance | partial                 | profile/network actions         | unit only            | PARTIAL |
| Network management              | partial                | inline SQL         | partial             | partial                                   | partial                 | invitations/counts/discovery    | none                 | PARTIAL |
| People recommendations          | partial                | inline SQL         | partial             | block/visibility filters                  | partial                 | discovery screen                | unit only            | PARTIAL |
| People search                   | partial                | PostgreSQL adapter | partial             | visibility/block filters                  | none                    | `/search`                       | none                 | PARTIAL |
| Public organization directory   | partial migration      | inline SQL         | public read         | source-review only; no admin authority    | n/a                     | `/company/[slug]`               | MISSING              | PARTIAL |
| Posts                           | partial migration      | inline SQL         | partial             | human session + same-origin               | partial                 | composer/cards                  | MISSING              | PARTIAL |
| Feed                            | partial migration      | inline SQL         | partial             | visibility/block filters                  | partial                 | chronological/signal modes      | MISSING              | PARTIAL |
| Reactions/comments/mentions     | partial migration      | inline SQL         | reactions/mentions  | human session + same-origin               | reactions partial       | reactions partial               | MISSING              | PARTIAL |
| Notifications                   | partial migration      | inline SQL         | aggregation partial | recipient-only query missing              | write-side partial      | honest unavailable state        | MISSING              | PARTIAL |
| Messaging                       | MISSING                | MISSING            | MISSING             | MISSING                                   | MISSING                 | honest unavailable state        | MISSING              | MISSING |
| Source-linked jobs              | partial migration      | inline SQL         | public read         | no internal application collection        | n/a                     | public `/jobs`                  | MISSING              | PARTIAL |
| Internal job applications       | MISSING                | MISSING            | MISSING             | MISSING                                   | MISSING                 | MISSING                         | MISSING              | MISSING |
| Projects                        | partial schema/tags    | inline SQL         | create/public read  | owner-only write; public owner required   | POST `/api/projects`    | `/projects`, `/projects/[slug]` | MISSING              | PARTIAL |
| Saved content                   | MISSING                | MISSING            | MISSING             | MISSING                                   | MISSING                 | honest unavailable state        | MISSING              | MISSING |
| Settings/security UI            | partial session schema | partial            | partial             | partial                                   | sessions API exists     | partial                         | partial              | PARTIAL |
| Privacy editor                  | partial schema         | MISSING            | partial policy      | partial read enforcement                  | MISSING                 | MISSING                         | partial policy tests | MISSING |
| Volunteer moderation baseline   | migration `0024`       | inline SQL         | role/report service | admin assignment; scoped reviewer queue   | applications/reports    | apply, report, queue, admin     | MISSING              | PARTIAL |
| MCP gateway/approval protocol   | partial contracts      | MISSING            | partial contracts   | partial contracts                         | MISSING                 | MISSING                         | partial unit tests   | MISSING |
| Audit/trust/rate-limit runtime  | partial schema         | MISSING            | partial contracts   | MISSING                                   | MISSING                 | MISSING                         | partial unit tests   | MISSING |

`MISSING` UI route entries are intentionally represented by explicit unavailable states where a
route is already part of the authenticated shell; they are not implemented product features.
