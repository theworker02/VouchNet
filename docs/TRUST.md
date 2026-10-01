# Trust and safety

The trust package has an explicit decision vocabulary: `ALLOW`, `RATE_LIMIT`, `CHALLENGE`, `REQUIRE_REAUTH`, `REQUIRE_HUMAN_APPROVAL`, `TEMPORARY_RESTRICTION`, `AUTOMATION_REVOKED`, `REVIEW_REQUIRED`, and `SUSPENDED`.

Its current evaluator is intentionally small and deterministic. Later waves will supply explainable signals such as action velocity, duplicate content, device/session anomalies, challenge failures, and credential revocation. Probabilistic signals alone must not permanently ban an account.

The live follow and Contact routes perform authentication, ownership/recipient checks, block
checks, and same-origin browser protection. Contact requests additionally have a deterministic
velocity guard: after ten requests in a rolling 24-hour window, the eleventh attempt creates a
server-side restriction lasting 24 hours. The client receives an exact reset time and may dismiss
the notice, but dismissal never bypasses the restriction. This is intentionally enforced in the
write transaction, rather than trusting a browser-side counter.

The current guard is a targeted first control, not a substitute for the planned distributed rate
limiter, trust-engine signals, or append-only audit ledger. Those broader controls remain tracked
as **MISSING** in the implementation matrix and must close before the social graph can be called
fully production-ready at scale.
