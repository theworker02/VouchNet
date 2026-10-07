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

## Feature-for-feature vs LinkedIn

LinkedIn is our direct competitor — the incumbent this product replaces. Where its IA and surface
area make people work, and what VouchNet does instead:

| LinkedIn                                                                     | VouchNet                                                                                                                                                              |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Feed-first: the product is an algorithmic feed you must scroll to understand | Object-first: six named parts on `/about`; the feed is one part, not the product                                                                                      |
| Endorsements are one-click, weightless, and inflated                         | Vouches are signed, specific, and form an inspectable trust graph                                                                                                     |
| Company pages: marketing wall, no way to verify who runs it                  | `/company/<slug>` is claimable by the real team via verified-email invites, with a `DOMAIN_VERIFIED` badge                                                            |
| Skills are a flat list anyone can claim                                      | Work experience with employment-type, location-type, and month/year selectors; languages picked from a curated catalog                                                |
| "Services" buried in a marketplace flow                                      | Services + hourly rate live on the profile; a formal request lands in an inbox the provider owns                                                                      |
| Games/engagement tricks to drive time-on-site                                | A small arcade (`/games`) of actual strategy games — a daily puzzle, Connect Four, Nim — no ads, no streak pressure                                                   |
| Login wall for everything; public pages are teaser fragments                 | Profiles, companies, projects, jobs, and posts render publicly and are indexable (JSON-LD, sitemap, IndexNow)                                                         |
| AI features surface as the product ("AI can write this")                     | One rule: humans participate; AI is an explicitly authorized tool via scoped credentials                                                                              |
| Settings model scattered across dozens of pages                              | Privacy and visibility live under `/settings`, public surface documented in `sitemap.xml`                                                                             |
| Profile chrome crowded by ads and "People also viewed" modules               | Same stacked-card profile layout (banner, overlapping avatar, section cards: About, Languages, Experience, Services, Badges, Trust graph) — minus the ads and upsells |

Deliberate non-goals: no reaction inflation, no follower leaderboards, no infinite-scroll-bait
layout, no promoted content. Anything that exists only to raise a metric is out of scope.

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
