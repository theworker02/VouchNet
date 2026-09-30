# Trust and safety

The trust package has an explicit decision vocabulary: `ALLOW`, `RATE_LIMIT`, `CHALLENGE`, `REQUIRE_REAUTH`, `REQUIRE_HUMAN_APPROVAL`, `TEMPORARY_RESTRICTION`, `AUTOMATION_REVOKED`, `REVIEW_REQUIRED`, and `SUSPENDED`.

Its current evaluator is intentionally small and deterministic. Later waves will supply explainable signals such as action velocity, duplicate content, device/session anomalies, challenge failures, and credential revocation. Probabilistic signals alone must not permanently ban an account.

The live follow and Contact routes currently perform authentication, ownership/recipient checks,
block checks, and same-origin browser protection. They do **not** yet invoke the trust engine,
distributed rate limiter, or append-only audit ledger. Those gaps are tracked as **MISSING** in the
implementation matrix and must close before these routes are production-ready.
