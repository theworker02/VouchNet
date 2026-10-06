# MCP

MCP is designed as a dedicated, scoped gateway—not a human-session substitute. Wave A supplies a closed scope vocabulary and revocation-aware credential contract. It does not expose an MCP server yet.

Wave J will add hashed-at-rest secrets, per-credential revocation and rate limits, attributable audit events, read and draft tools, and an Automation Inbox. Protected output will require a short-lived, single-use server approval bound to user, session, action, payload hash, nonce, and expiry.

MCP use will be paid with prepaid credits, not a subscription. Each tool call will spend the
`mcp.tool_call` cost from the credential owner's balance and be refused with HTTP 402
`INSUFFICIENT_CREDITS` when the balance is too low; see [Prepaid API and MCP credits](API_CREDITS.md).
Credits are in addition to scopes, rate limits, audit events, and human approval.
