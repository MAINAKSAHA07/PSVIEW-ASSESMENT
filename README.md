# AgentForge - Autonomous Recruiting Agent Builder

## What I built

A web app where a company configures an autonomous recruiting agent through
conversation (not forms). The agent interviews the company, challenges vague
inputs, builds its own personality, plans an outreach strategy, and runs a
live candidate simulation with visible reasoning traces.

Three ways to configure: conversational interview, file upload, or quick
setup form. All three converge into the same intelligence pipeline.

## What makes the agent intelligent, not just an LLM call

The agent reasons before it acts. Configuration is a multi-turn conversation
where the agent decides what to ask, pushes back on generic answers, and
autonomously determines when it has enough context. The pipeline separates
understanding (extraction), identity (persona synthesis), planning (strategy),
and execution (message generation), with each step's output stored and visible.
During simulation, the agent reads candidate signals, adjusts strategy in real
time, and shows its full reasoning chain, not just the output.

## Stack

React, TypeScript, Supabase (Postgres + Edge Functions), OpenAI API
(GPT-4.1 / 4.1-mini / 4.1-nano), Vercel, Tailwind CSS.

## Architecture choices

- Conversational config over forms: mirrors how PSVIEW's actual clients would
  onboard. The agent's intelligence is visible from the first interaction.
- Three-model routing: GPT-4.1 for evaluator-facing interactions, mini for
  pipeline steps, nano for utility tasks. Keeps cost under $0.12/session.
- Two Postgres tables + JSONB: sessions (one row = complete state) and
  messages (flat log). One query per screen, sub-5ms DB response.
- Source-tagged extraction with confidence scores: every fact traces back to
  where the company said it. Null source = agent cannot reference it.
  Prevents hallucination architecturally, not just via prompting.
- Integration-ready schema: tables for ATS/HRIS connections (Workday,
  Greenhouse, Lever) exist but aren't wired, showing product-level thinking.

## Running locally

1. Clone the repo
2. Copy `.env.example` to `.env` and fill in Supabase + OpenAI keys:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `OPENAI_API_KEY` (for Edge Functions)
3. Create a Supabase project, enable Google OAuth, run `supabase/migrations/001_create_tables.sql`
4. Deploy Edge Functions and set secrets:
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-...
   supabase functions deploy configure
   supabase functions deploy synthesize
   supabase functions deploy simulate
   ```
5. `npm install`
6. `npm run dev`

## Live demo

- **App:** https://psviewagent.vercel.app
- **Repo:** https://github.com/MAINAKSAHA07/PSVIEW-ASSESMENT

## 2-minute evaluator path

1. Sign in with Google → choose **Employer**
2. Upload a company doc or chat through config → **Generate Agent**
3. Review persona + strategy → **Start simulation**
4. Use quick-reply chips or type as the candidate (e.g. "What's the compensation?")
5. Watch the **Agent reasoning** panel update each turn — sentiment, strategy shift, persona check, message rationale
6. **Publish** the role → sign in as **Candidate** → apply and talk to the same agent

Nothing is sent externally. The simulation is a sandbox preview of outbound messages.
