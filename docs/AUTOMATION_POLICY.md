# Automation policy

Humans and machines are distinct principals. Machine clients may read scoped data and prepare drafts. They may not independently commit protected social actions, register accounts, accept terms, evade controls, impersonate users, generate engagement, or scrape consumer surfaces.

Every future operation is classified as `READ`, `PREPARE`, or `COMMIT`. A `COMMIT` is a human operation or a moderator operation; integrations transition protected work into pending human approval. No client-supplied approval flag is trusted.
