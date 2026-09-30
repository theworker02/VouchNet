# Threat model

Primary threats include fake accounts, credential stuffing, account takeover, session theft, automated posting, engagement farming, connection spam, scraping, credential theft, malicious MCP servers, approval replay/tampering, phishing, malicious uploads, organization impersonation, IDOR, privilege escalation, and moderator abuse.

Wave A mitigations: explicit actor types, explicit action classes, a payload/session-bound approval contract, scope vocabulary, revocation semantics, centralized rate-limit policies, append-oriented audit contract, minimal logging, and baseline web headers.

Residual risk: identity proofing, authentication controls, Redis enforcement, human approval persistence, abuse signals, uploads, moderation tooling, and endpoint authorization are not implemented until their designated waves. This is a foundation, not a production social network release.
