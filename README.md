# AgentForge

Configure a recruiting agent through conversation, watch it reason through candidate engagement in real time.

**Live app:** https://psviewagent.vercel.app
**Repo:** https://github.com/MAINAKSAHA07/PSVIEW-ASSESMENT

---

## The brief, mapped to what's built

**1. "A simple form to capture a company's context"**

Three paths, one pipeline. Upload a company doc (PDF/DOCX/TXT), talk to the agent through voice or text chat, or expand the quick-setup form. All three extract the same structured profile with source tags and confidence scores. The conversational path is the default because it mirrors how a staffing client would actually onboard: the agent interviews the company, pushes back on vague answers, and decides when it has enough context.

**2. "An agent that configures itself from that context"**

After configuration, the agent runs a four-step synthesis pipeline: reconcile the company profile (resolve contradictions from the conversation), generate a persona (name, personality traits, communication style, vocabulary rules), plan a multi-step outreach strategy (per-message intent, approach, tone), and produce the opening message. The persona card and strategy plan are shown before simulation starts so the evaluator can see what the agent decided to become.

**3. "A test area to preview it all"**

The simulation view is a split panel. Left: the conversation thread with quick-reply chips. Right: the agent's reasoning trace for each message, showing candidate sentiment analysis, strategy adjustments, persona compliance checks, and message rationale. An amber banner confirms nothing is sent externally.

---

## What makes the agent intelligent, not just an LLM call

Each reply runs a three-phase pipeline, not a single prompt:

1. **Analyze** (GPT-4.1-nano): classify candidate sentiment, intent, detect action requests, track which topics were already covered, flag whether a call was already scheduled
2. **Strategy check** (GPT-4.1-nano): compare the analysis against the outreach plan, decide if the objection playbook should activate, determine whether advancing to a call is appropriate
3. **Generate** (GPT-4.1): write the message constrained by the persona (trait scores, vocabulary rules, style notes), the strategy (current step, adjustments), and conversation rules (never repeat information, answer before advancing, match length to moment)

The analysis and strategy check run in parallel, then feed into generation. Every step's output is stored per-message and visible in the reasoning panel. The intelligence is in the separation of concerns and the state that accumulates across turns, not in a single prompt that tries to do everything at once.

Grounding is enforced architecturally: every fact in the company profile has a source tag. If a field has no source, the agent cannot reference it. Names are restricted to those explicitly in the company profile. The agent cannot claim to perform actions it cannot execute (no "I'll send a calendar invite").

---

## Beyond the brief

These are not required for grading but show product-level thinking:

- **Candidate portal**: sign in as a candidate, browse published roles sorted by match score, talk to the agent directly through voice or text, upload a resume to update match scoring in real time
- **Skill matching engine**: 400-line algorithm with canonical skill groups, weighted coverage scoring, experience range fitting, full-stack pillar detection, and role-title matching (`src/lib/matching.ts`)
- **Employer dashboard**: view applicants per role, see applied candidates alongside suggested matches at 75%+, expand candidate summaries with interest scores and objection resolution status
- **Candidate summary**: after 4+ simulation turns, generate a structured assessment (interest level, motivators, concerns, behavioral signals, recommended next step)
- **Admin panel**: platform stats, user/role management, company and candidate creation, conversation browser, interest score overview
- **Voice interaction**: browser speech recognition with auto-listen after agent speaks, Web Speech API for agent voice output, voice/text toggle
- **Conversation export**: copy the full conversation as markdown with reasoning traces and summary
- **Resume parsing**: upload a PDF/DOCX resume, extract skills and experience via LLM, auto-populate candidate profile
- **Light/dark mode**: CSS variable theming with localStorage persistence

---

## Stack

React 18, TypeScript, Vite, Tailwind CSS
Supabase: Postgres, Auth (Google OAuth), Edge Functions, RLS
OpenAI: GPT-4.1 (conversation), GPT-4.1-mini (pipeline), GPT-4.1-nano (analysis)
Vercel

---

## Architecture

```
React app (Vercel)
  Config phase  ->  Synthesis  ->  Agent reveal  ->  Simulation
       |               |              |               |
  3 Edge Functions (Supabase)
       |
  /configure         /synthesize         /simulate
  chat|upload|form   reconcile>persona   analyze>strategy>generate
                     >strategy>first msg  (parallel where possible)
       |                                      |
  OpenAI API                            Reasoning stored
  (3 models, routed by task)            per message in DB
       |
  Postgres (2 core tables + JSONB)
  sessions: one row = complete state
  messages: flat log, both phases
```

Cost: ~$0.12/session. DB response: <5ms/query.

---

## Evaluator path (2 minutes)

1. Open https://psviewagent.vercel.app, sign in with Google
2. Choose **Employer**
3. Upload a company PDF (or use voice/text chat, or expand Quick setup)
4. Click **Generate Agent**, watch the synthesis steps
5. Review the persona card (traits, vocabulary) and outreach strategy
6. Click **Start conversation**
7. Type candidate replies or use the quick-reply chips
8. Watch the **Reasoning** panel update each turn
9. After 4+ turns, click **Generate summary** for a candidate assessment
10. Optional: **Publish** the role, sign out, sign in as **Candidate**, browse and talk to the same agent

---

## Running locally

```bash
git clone https://github.com/MAINAKSAHA07/PSVIEW-ASSESMENT
cd PSVIEW-ASSESMENT
cp .env.example .env    # fill in VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Supabase setup: create a project, enable Google OAuth, run all migrations in order (001 through 009), deploy Edge Functions:

```bash
supabase secrets set OPENAI_API_KEY=sk-...
supabase functions deploy configure synthesize simulate parse-resume admin-users
```

---

## Known limitations

- Google OAuth required (no anonymous demo mode)
- Agent conversation quality improved through prompt iteration but can still occasionally over-schedule or slip on edge cases
- No streaming on simulation responses (full response appears after 3-4s)
- Mobile simulation view uses tab toggle between conversation and reasoning panels

---

## Project layout

```
src/
  pages/Main.tsx                 Employer flow: config > synthesis > reveal > simulation
  components/config/             Company context capture (chat, voice, upload, form)
  components/simulation/         Sandbox conversation + reasoning panel
  components/candidate/          Candidate portal (browse, apply, voice chat)
  components/employer/           Dashboard, applicant pool, publish flow
  components/admin/              Platform management
  lib/matching.ts                Skill matching algorithm (400+ lines)
  lib/api.ts                     Edge Function client + Supabase queries

supabase/
  functions/configure/           Config conversation + field extraction
  functions/synthesize/          Reconciliation > persona > strategy > first message
  functions/simulate/            Analyze > strategy check > message generation
  shared/prompts.ts              All system prompts + grounding rules
  migrations/001-009             Schema evolution (tables, RLS, RPCs, triggers)
```