# Implementation matrix

This is a reality audit of the current VouchNet vertical slices. A feature is only **COMPLETE**
when its database, service, authorization, API, UI, error/empty states, and tests form a usable
path. Prefer this matrix over older Phase 5 notes when they disagree.

| Feature                             | Database             | Service / API                                                         | UI                                         | Tests                    | Status  |
| ----------------------------------- | -------------------- | --------------------------------------------------------------------- | ------------------------------------------ | ------------------------ | ------- |
| Email/password identity             | complete             | register/login/verify/reset                                           | login/signup/verify                        | partial                  | PARTIAL |
| Server sessions                     | complete             | cookie sessions + idle expiration                                     | settings sessions                          | partial                  | PARTIAL |
| MFA                                 | complete (`0028`)    | enroll/verify/disable                                                 | settings security                          | partial                  | PARTIAL |
| Professional profiles               | complete             | public read + owner edit                                              | `/in`, `/vouch`, onboarding                | partial                  | PARTIAL |
| Follow / contacts / network         | complete             | follow, connections, discover                                         | network + discovery                        | unit only                | PARTIAL |
| People search                       | complete             | PostgreSQL search                                                     | `/search`                                  | none                     | PARTIAL |
| Public organizations + jobs         | complete             | directory + employer intake                                           | `/company`, `/jobs`, `/jobs/post`          | partial                  | PARTIAL |
| Native job applications             | complete (`0020`)    | apply + candidate pipeline                                            | apply + `/org/jobs/.../candidates`         | partial                  | PARTIAL |
| Posts / feed / reactions            | complete             | feed, reactions, comments                                             | `/feed`                                    | partial                  | PARTIAL |
| Saved posts                         | complete (`0040`)    | `/api/saved`                                                          | feed Save control + `/saved`               | API unit                 | PARTIAL |
| Messaging                           | complete (`0026`)    | browser + desktop device routes                                       | `/messaging`, Desktop inbox                | partial                  | PARTIAL |
| Notifications                       | complete             | member notifications + mark-all-read                                  | `/notifications`                           | partial                  | PARTIAL |
| Projects / Discover / opportunities | complete (`0029`)    | build-in-public surfaces                                              | `/projects`, `/discover`, `/opportunities` | partial                  | PARTIAL |
| Desktop client                      | device auth (`0027`) | feed, messages, activity, network, search, jobs, opportunities, saved | Tauri Windows client (1.6)                 | package build + API unit | PARTIAL |
| Volunteer moderation                | complete (`0024`)    | apply/report/queue                                                    | moderation + admin                         | none                     | PARTIAL |
| Prepaid API credits                 | complete (`0029`)    | Stripe Checkout + metering                                            | account + developer center                 | inventory test           | PARTIAL |
| Public OAuth + directory API        | complete             | userinfo, applicant, people/orgs/jobs + `oauthApi` limits             | Developer center + GitHub Packages client  | API unit                 | PARTIAL |
| Privacy / visibility settings       | complete             | settings APIs                                                         | `/settings/visibility`                     | partial                  | PARTIAL |
| MCP gateway / approval protocol     | contracts only       | not publicly live                                                     | developer docs only                        | unit contracts           | MISSING |
| Audit / trust runtime               | partial schema       | partial contracts                                                     | admin/error telemetry only                 | partial                  | PARTIAL |

`MISSING` means the product still withholds a fake UI. Partial means a usable path exists but
tests, edge coverage, or secondary clients remain incomplete.
