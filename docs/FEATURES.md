# Youth Dev AI — Feature roadmap (strength-based, hope-oriented)

All experiences stay **strength-first**: empowering **power indicators** (adjectives / short phrases), **no deficit labels**, **positive narrative feedback**, and a **memorable symbolic identity** (for example “Harmony Weaver”, “Spark Igniter”). AI does not assign clinical or fixed personality types.

This document splits work into **MVP (core)** and **Full / scalable (advanced)**. “Cheaper alternate” options are noted where they trade depth for speed or cost.

---

## 1. Onboarding & personalization

| Feature | MVP (core) | Full / scalable (advanced) | Cheaper alternate (trade-offs) |
|--------|------------|------------------------------|--------------------------------|
| **Age-gated onboarding** (11–13, 14–16, 17–18) | Age band selection; age-adaptive **copy/tone**; consent + guardian attestation for younger bands (as implemented in code—**not** a substitute for lawyer-reviewed parental verification). | **Verified** parental consent where required (COPPA, India DPDP, etc.); regional rules engine; optional school/institution flows. | Single signup, no age gate — **high legal and safety risk**, weak personalization. |
| **Interaction style by age** | Same UI with **tone** and scenario wording tuned by band; optional shorter copy for 11–13. | **Distinct** flows: richer visuals / “mini-adventures” for younger bands; deeper reflection and (optional) **guided chat** for 17–18. | One UI for all ages — cheaper, less effective per cohort. |

---

## 2. Assessment & “superpower” discovery

| Feature | MVP (core) | Full / scalable (advanced) | Cheaper alternate |
|--------|------------|------------------------------|-------------------|
| **Adaptive assessment** | Scenario bank (choice + optional short text); **semi-dynamic** branching (e.g. age band + light rules); feels like stories, not grades. | **AI-personalized** follow-up questions in session; richer “mini-adventures”; optional real-time difficulty or theme adjustment from prior answers. | Fixed branching quiz — lower cost, **less** “seen” / dynamic. |
| **Gamified framing** | Progress, encouraging micro-copy, **non-scored** journey (no failure states). | Badges, quests, levels, streaks, rewards tied to **habits** (not IQ-style scores). | Simple points only — lighter build, less sticky. |

---

## 3. Strength & identity (always core product value)

| Feature | MVP (core) | Full / scalable (advanced) | Cheaper alternate |
|--------|------------|------------------------------|-------------------|
| **AI strength layer + power indicators** | 4–5 positive adjectives grounded in responses; moderation + consent-aware pipeline. | Richer trait model over time; consistency checks across sessions; optional multilingual indicators. | Static list (e.g. VIA-style) + user pick — **not** AI-personalized. |
| **Narrative + symbolic identity** | One unified AI pass: narrative + **2–3 word** symbolic name + micro-action + reflection prompt. | Chaptered narratives; “identity evolution” copy; A/B tested tone packs by region. | Plain bullet report — faster, **less** emotional connection. |

---

## 4. Living profile & evolution (flagship for “best version”)

| Feature | MVP (core) | Full / scalable (advanced) | Cheaper alternate |
|--------|------------|------------------------------|-------------------|
| **Living profile dashboard** | Session-based or **versioned snapshots** when accounts + DB exist; simple “latest vs last visit” when you add persistence. | Full timeline, visuals, re-assessment prompts, growth arcs, export/share controls. | One-time PDF — OK for early pilots, **not** the long-term vision. |
| **Periodic check-ins + reflection journal** | Manual “come back” CTA; optional email/WhatsApp later. | Scheduled **AI check-ins**, weekly prompts, journal with **strength-based** AI insights (with strict safety). | Manual journal only — no AI, lower engagement. |
| **Goals + opportunity insights** | One **micro-action** + hope/connection oriented nudge (MVP slice). | Strength-linked goals, activities, learning paths; **opportunity** suggestions with human-reviewed libraries per region. | Generic goal templates — cheaper, weaker personalization. |

---

## 5. Platform, trust, and scale (cross-cutting)

| Item | MVP | Full / scalable |
|------|-----|-----------------|
| **Legal & trust** | In-app Privacy / Terms templates, consent metadata, moderation hooks (as in repo). | Counsel-reviewed policies, DSR tooling, subprocessors, DPIA, regional hosting. |
| **Data** | Session-first MVP; path to PostgreSQL for users + snapshot history. | Multi-region, retention jobs, analytics with privacy budgets. |
| **Ecosystem** | — | Parent / school dashboards, referrals, partner content. |

---

## 6. Current repo vs this map (honest snapshot)

Implemented in this codebase:

- Age band onboarding, **consent + policy pages**, **moderation** (local + OpenAI when keyed).
- **Semi-fixed** scenario assessment (12 story moments) with **shorter scenario copy for 11–13** and **age-tuned subtitles / typography** on the assessment screen.
- **Unified AI profile** (power indicators + symbolic identity + narrative + micro-action + reflection).
- **Living profile (browser layer):** `localStorage` snapshot timeline on **`/profile`** (last 15 runs), plus **re-run scenarios** (clears answers + cached result).
- **Light gamification:** XP, level, streaks, badges on new profile generation; small XP for journal saves.
- **Check-ins + journal:** **`/check-in`** with rotating weekly prompts and local-only entries.
- **Play hub + coach chat:** **`/play`** surfaces XP / badges / streaks; **`/coach`** is a multi-turn strengths coach (`POST /api/coach`, Groq or OpenAI when keys are set; mock lines only if **`ALLOW_LLM_DEMO=true`** in backend env).
- **Opportunity nudges:** curated, strength-linked suggestion blocks on the **results** page.
- **Parent verification:** **`/parent`** documents the gap vs true verified consent (engineering placeholder, not a legal product).

Still not implemented (needs heavier product / infra):

- Full server accounts + PostgreSQL persistence, verified parental consent **workflows** (OTP / payment micro-verification), parent/school dashboards.
- **True** session-by-session AI-authored question streams (beyond copy variants + the unified profile call).
- Full quest maps, economies, analytics, and multilingual content pipelines.

---

## 7. Versioning

When product or legal posture changes, bump **policy / consent versions** in:

- `frontend/lib/policy.ts`
- `backend/app/policy_constants.py`

…so users re-acknowledge material updates.
