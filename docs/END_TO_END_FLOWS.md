# End-to-end flow status

## Available in local development (PARTIAL)

1. A user submits sign-up details and acceptance records are created in PostgreSQL.
2. The development verification adapter routes the user to a verification confirmation page.
3. After verification, the user signs in and receives a server-side, HttpOnly session cookie.
4. The user can edit headline, location, and about information; refresh retains it.
5. A signed-in user can search an eligible profile, open it, follow it, or issue a Contact request.
6. The receiving user can see the request on Network and accept or decline it.

## Not yet available

The Alice/Bob/Carol social, messaging, organization, job, notification, reaction, and feed journeys
are not implemented. They must not be described as passing until migrations, services, APIs, UI,
and deterministic E2E tests exist.
