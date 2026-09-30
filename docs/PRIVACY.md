# Privacy

VouchNet minimizes security telemetry to what is needed to defend the platform. Foundation audit interfaces omit credentials, passwords, raw tokens, and private message bodies. Trust signals and retention choices will be documented as they are introduced.

Profile, discoverability, messaging, and activity visibility controls begin after identity and social graph foundations exist. They must be enforced through every API, not merely hidden in the interface.

## Current enforcement (PARTIAL)

The profile route and people search allow only public/member profiles for a signed-in user, plus the
owner's own profile. They also exclude both sides of a blocked relationship. Contacts-only, private,
follower-specific, messaging, connection-list, activity, email, and search-index preference controls
are not complete and have no public claim of support.
