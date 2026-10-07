# Information architecture — VouchNet vs comparable sites

VouchNet's information architecture (IA) is designed so a first-time visitor can answer "what is
this and where do I go" in under a minute. This document compares our IA to ElevenLabs, OpenAI, and
LinkedIn — the products visitors most often anchor to — and records the rules we keep.

## The comparison

| Site         | First screen answers                         | Mental model                                       | Depth to reach "what the product does"                   |
| ------------ | -------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------- |
| ElevenLabs   | A product suite (Creative / Agents / API)    | 3+ products sharing a research brand               | ~2 screens of feature banners before plain language      |
| OpenAI       | Research + product families (models, apps)   | Brand-first; products discovered through menus     | Menu-diving; no single "how it fits together" page       |
| LinkedIn     | A feed-first logged-out wall + signup funnel | Social graph internals hidden from public visitors | Public pages exist but the product model is undocumented |
| **VouchNet** | One rule: humans participate, AI is a tool   | 6 parts, each one link away, named on `/about`     | One page (`/about`) explains the whole network           |

## Where those sites make people work harder

- **Suite branding before substance.** ElevenLabs and OpenAI lead with named product families
  (ElevenAgents/ElevenCreative, ChatGPT/Sora/API) that assume you already know what each does.
  VouchNet names plain-language objects instead: People, Companies, Vouches, Jobs, Posts,
  Services.
- **No public map.** None of them publish a human-readable "everything and where it lives" page.
  VouchNet's `/about` does exactly that, and every public entity sits at a predictable URL
  (`/vouch/<slug>`, `/company/<slug>`, `/projects/<slug>`, `/jobs/<slug>`, `/post/<id>`).
- **Feed-first mystery.** LinkedIn hides its model behind a login wall. VouchNet's public pages
  (profiles, companies, posts, jobs) render without an account, so the architecture is inspectable,
  crawlable, and linkable.

## Rules we enforce

1. **One canonical URL shape per entity** — person `/vouch/<slug>`, organization `/company/<slug>`,
   project `/projects/<slug>`, job `/jobs/<slug>`, post `/post/<id>`. No aliasing.
2. **Every public page links back to the model** — claim cards, "Join" CTAs, and `/about` give
   each page a route into understanding the whole.
3. **Public by default, member-only by choice** — posts can be PUBLIC/MEMBERS/CONTACTS; private
   areas (messages, settings, admin) are never linked from public IA or the sitemap.
4. **`/about` stays honest** — it is regenerated from the same sections the product actually
   exposes; a feature that isn't shipped isn't described.

## Checklist when adding a new public surface

- Does it fit one of the six parts on `/about`? If not, add a section or don't ship the route.
- Is the URL shape consistent with the table above?
- Is it in `sitemap.ts` and (if indexable) eligible for `submitToIndexNow`?
- Does it avoid naming that reads like suite branding (no invented sub-product names)?
