# PSVIEW Agent Builder - Execution Plan

## Project overview

A mini web app that demonstrates autonomous AI agent configuration and candidate engagement. The agent interviews the company through conversation, configures itself with a distinct personality, generates a strategic outreach sequence, and runs a live simulated conversation with visible reasoning traces.

**Deliverables:** Deployed Vercel URL, GitHub repo, README with architecture rationale.

**README one-liner (what makes it intelligent, not just an LLM call):**
"The agent is intelligent because it begins reasoning before it's even configured. It interviews the company, challenges vague inputs, autonomously decides when it knows enough, then plans a multi-step engagement strategy with per-message reasoning that adapts to candidate signals in real time."

---

## Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React 18 + TypeScript + Vite | PSVIEW's stack, fast dev |
| Styling | Tailwind CSS 3.x | Utility-first, rapid dark UI |
| Backend/DB | Supabase (Postgres + Edge Functions) | PSVIEW's stack, auth built in |
| Auth | Supabase Google OAuth | One-click sign in |
| LLM (evaluator-facing) | OpenAI GPT-4.1 | Config conversation, response processing |
| LLM (pipeline) | OpenAI GPT-4.1-mini | Persona synthesis, strategy, message gen |
| LLM (utility) | OpenAI GPT-4.1-nano | Extraction, sentiment, consistency checks |
| Deployment | Vercel | PSVIEW's stack, instant deploys |
| Fonts | Google Fonts: Instrument Serif, Inter, JetBrains Mono | Three-font system with clear roles |

---

## Design system

### Color palette (Option A: Coral + Teal on dark)

```
Primary:         #E8614D  (coral, warm, human)
Accent:          #2DD4A8  (teal, intelligence/reasoning layer)

Background:      #0F0F13  (near-black)
Surface:         #1A1A23  (cards, chat bubbles)
Surface raised:  #24243A  (hover states, active elements)

Text primary:    #ECECF1  (soft white)
Text secondary:  #8B8B9E  (muted labels)
Text tertiary:   #4A4A5C  (timestamps, hints)

Border:          #2A2A3C  (subtle separation)

Error/negative:  #F87171  (red for "avoids" vocabulary)
```

### Typography

```
Headings/Agent name:    'Instrument Serif', serif     (400 weight)
Body/UI:                'Inter', sans-serif           (400/500 weight)
Reasoning trace panel:  'JetBrains Mono', monospace   (400 weight)
```

### Tailwind config additions

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        coral: {
          DEFAULT: '#E8614D',
          dark: '#C44A38',
          light: 'rgba(232, 97, 77, 0.1)'
        },
        teal: {
          DEFAULT: '#2DD4A8',
          dark: '#1AAF8B',
          light: 'rgba(45, 212, 168, 0.1)'
        },
        surface: {
          bg: '#0F0F13',
          card: '#1A1A23',
          raised: '#24243A',
          border: '#2A2A3C'
        },
        txt: {
          primary: '#ECECF1',
          secondary: '#8B8B9E',
          tertiary: '#4A4A5C'
        }
      },
      fontFamily: {
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace']
      }
    }
  }
}
```

### Design rules

- Dark background throughout, no light mode toggle needed
- Coral is for interactive/user elements (buttons, user messages, agent avatar, CTAs)
- Teal is for intelligence/reasoning elements only (reasoning panel borders, extraction tags, status indicators)
- Chat bubbles: agent messages = surface card (#1A1A23), user messages = coral (#E8614D)
- Reasoning panel: slightly darker background (#13131A), teal left-borders on trace blocks
- Border radius: 12px for cards/panels, 8px for buttons/tags, 50% for avatars
- No gradients except the agent avatar icon (coral-to-teal, single exception)
- Minimum font size: 11px
- No em dashes anywhere in the UI or agent output

---

## Database schema

### Table 1: sessions

The single source of truth for an entire evaluation. One row per complete experience.

```sql
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'configuring',
  -- Status values: 'configuring', 'synthesizing', 'ready', 'simulating'

  -- Raw input
  config_source TEXT DEFAULT 'conversation',
  -- Values: 'conversation', 'upload', 'quicksetup'
  uploaded_file_text TEXT,

  -- Extracted company profile (reconciled)
  company_profile JSONB DEFAULT '{}',

  -- Derived agent identity
  agent_persona JSONB DEFAULT '{}',
  agent_strategy JSONB DEFAULT '{}',

  -- Candidate simulation context
  candidate_context JSONB DEFAULT '{}',

  -- Integration link (future)
  source_integration UUID REFERENCES integrations(id),
  candidate_source JSONB DEFAULT '{}'
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
```

**company_profile JSONB shape:**

```json
{
  "company_name": "PSVIEW",
  "industry": "AI for staffing",
  "size": "15",
  "stage": "Series A",
  "what_they_do": "Autonomous AI agents for candidate engagement",
  "culture": "Ship daily, work with founders, no layers",
  "what_makes_people_thrive": "Builders who ship fast and talk to clients",
  "role": "Founding Engineer",
  "ideal_candidate": "Full-stack, ships fast, comfortable client-facing",
  "pitch": "Equity, founder access, own features end to end",
  "tone": "bold",
  "extras": {},
  "field_sources": {
    "company_name": { "source": "turn_1", "confidence": 1.0 },
    "culture": { "source": "uploaded_file", "confidence": 0.95 },
    "tone": { "source": "turn_4", "confidence": 0.8 }
  }
}
```

**agent_persona JSONB shape:**

```json
{
  "name": "Alex",
  "summary": "Direct and energetic. Leads with mission, not perks. Matches candidate energy, keeps it peer-level, never salesy.",
  "traits": {
    "formality": 0.3,
    "warmth": 0.7,
    "assertiveness": 0.6,
    "humor": 0.4
  },
  "style_notes": [
    "Uses short sentences",
    "References specific projects and team details",
    "Avoids corporate jargon and buzzwords",
    "Asks one question per message"
  ],
  "vocabulary_do": ["ship", "build", "own", "solve"],
  "vocabulary_dont": ["synergy", "leverage", "circle back", "deep dive"]
}
```

**agent_strategy JSONB shape:**

```json
{
  "sequence_length": 3,
  "steps": [
    {
      "position": 1,
      "intent": "Hook with specific company detail and personalized reference",
      "approach": "Connect candidate background to company mission",
      "tone_target": "curious, peer-level"
    },
    {
      "position": 2,
      "intent": "Deepen interest with insider detail",
      "approach": "Share specific project or team culture proof point",
      "tone_target": "confident, informative"
    },
    {
      "position": 3,
      "intent": "Soft close",
      "approach": "Make saying yes easy, low commitment ask",
      "tone_target": "warm, no pressure"
    }
  ],
  "objection_playbook": {
    "not_looking": "Acknowledge, pivot to future relationship",
    "compensation": "Redirect to equity and growth story",
    "remote": "Highlight async culture if applicable",
    "too_small": "Frame as feature: ownership, speed, impact",
    "happy_where_i_am": "Respect it, plant seed about what's different here"
  }
}
```

### Table 2: messages

Flat message log for both configuration and simulation phases.

```sql
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),

  phase TEXT NOT NULL,
  -- Values: 'config', 'simulation'

  role TEXT NOT NULL,
  -- Values: 'agent', 'user', 'system'

  content TEXT NOT NULL,

  -- Only populated for simulation-phase agent messages
  reasoning JSONB
);

CREATE INDEX idx_messages_session
  ON messages(session_id, phase, created_at);
```

**reasoning JSONB shape (on simulation agent messages):**

```json
{
  "candidate_analysis": {
    "sentiment": "interested_but_cautious",
    "intent": "asking_about_compensation",
    "signals": ["mentioned current salary", "used conditional language"]
  },
  "strategy_adjustment": "Activating compensation objection playbook. Pivoting to equity and growth narrative.",
  "persona_check": {
    "tone_match": true,
    "vocabulary_compliance": true,
    "notes": "Used 'build' and 'own' vocabulary. Avoided 'competitive compensation', too corporate."
  },
  "message_rationale": "Candidate is testing the waters on comp. Direct answer builds trust. Leading with equity story because company profile emphasizes early-stage upside.",
  "strategy_position": "Message 2 of 3, responding to candidate reply"
}
```

### Table 3: integrations (future-ready, not wired)

```sql
CREATE TABLE integrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),

  provider TEXT NOT NULL,
  -- Values: 'workday', 'greenhouse', 'lever', 'bullhorn', 'linkedin_rsc', 'custom_ats'

  status TEXT DEFAULT 'available',
  -- Values: 'available', 'connected', 'error'

  credentials JSONB DEFAULT '{}',
  config JSONB DEFAULT '{}',
  last_synced_at TIMESTAMPTZ
);

CREATE INDEX idx_integrations_user ON integrations(user_id, provider);
```

### Table 4: integration_logs (future-ready, empty)

```sql
CREATE TABLE integration_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID REFERENCES integrations(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id),
  created_at TIMESTAMPTZ DEFAULT now(),

  action TEXT NOT NULL,
  -- Values: 'candidate_import', 'message_push', 'status_sync'

  direction TEXT NOT NULL,
  -- Values: 'inbound', 'outbound'

  payload JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  -- Values: 'pending', 'success', 'failed'

  error TEXT
);

CREATE INDEX idx_integration_logs_integration
  ON integration_logs(integration_id, created_at);
```

### Row Level Security

```sql
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_sessions" ON sessions
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_messages" ON messages
  FOR ALL USING (
    session_id IN (
      SELECT id FROM sessions WHERE user_id = auth.uid()
    )
  );

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_integrations" ON integrations
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_own_logs" ON integration_logs
  FOR ALL USING (
    integration_id IN (
      SELECT id FROM integrations WHERE user_id = auth.uid()
    )
  );
```

---

## Edge Functions (API layer)

Three functions, eight action routes. Supabase free tier supports this comfortably.

### Function 1: configure

Handles all Phase 1 activity: conversational config, file upload, quick setup.

```
POST /functions/v1/configure

Request body:
{
  session_id: string,
  action: "chat" | "upload" | "quicksetup",
  message?: string,           // for "chat"
  file_text?: string,         // for "upload"
  form_data?: CompanyProfile  // for "quicksetup"
}

Response:
{
  agent_reply?: string,
  company_profile: CompanyProfile,
  ready_to_synthesize: boolean,
  gaps?: string[]
}
```

**action: "chat" flow:**

1. Load session from DB (current company_profile)
2. Load config-phase message history
3. Call GPT-4.1-nano: extract structured fields from user's latest message
   - Input: user message + current profile
   - Output: updated fields with source tags and confidence scores
   - Merge into company_profile
4. Call GPT-4.1: generate next agent question
   - System prompt enforces:
     - Exactly ONE question per turn
     - Under 40 words total
     - Mirror back key facts before asking
     - Never use em dashes, en dashes, or double hyphens
     - Never infer facts about the company from training data
     - If confidence on any field < 0.7, ask about that field
   - Input: conversation history + current profile + list of missing fields
   - Output: agent reply
5. Save user message + agent message to messages table
6. Update company_profile on session
7. Check if all key fields filled with confidence > 0.7
8. Return agent reply + current profile + ready flag

**action: "upload" flow:**

1. Receive extracted text from frontend (frontend handles file parsing)
2. Call GPT-4.1-mini: extract all company profile fields from document
   - All sources tagged as "uploaded_file"
3. Save to company_profile on session
4. Save system message to messages table
5. Identify missing fields
6. Return extracted profile + gaps + agent opening message addressing gaps

**action: "quicksetup" flow:**

1. Map form fields directly to company_profile schema
2. All sources tagged as "form"
3. Save to session
4. Return profile, mark ready_to_synthesize: true

### Function 2: synthesize

Intelligence pipeline. Transforms raw company context into agent identity.

```
POST /functions/v1/synthesize

Request body:
{
  session_id: string,
  action: "full" | "persona" | "strategy"
}

Response:
{
  agent_persona: AgentPersona,
  agent_strategy: AgentStrategy,
  first_message: {
    content: string,
    reasoning: ReasoningTrace
  }
}
```

**action: "full" flow (sequential, 4 steps):**

**Step 1 - Reconciliation (GPT-4.1-mini)**
- Input: full config conversation transcript + all per-turn extractions
- Output: cleaned, reconciled company profile
- Resolves contradictions (e.g., "casual" in turn 2 but "we take quality seriously" in turn 5)
- Saves reconciled profile to session

**Step 2 - Persona synthesis (GPT-4.1-mini)**
- Input: reconciled company profile
- System prompt:
  - Generate a complete agent personality based on the company context
  - Name the agent (short, professional, no surnames)
  - Write a first-person personality summary (2-3 sentences)
  - Set trait scores on four dimensions (0.0-1.0): formality, warmth, assertiveness, humor
  - List style notes (3-5 specific communication habits)
  - List vocabulary to use and vocabulary to avoid
  - Never use em dashes, en dashes, or double hyphens in any output
  - Output must be valid JSON matching the agent_persona schema
- Output: agent_persona JSONB
- Saves to session

**Step 3 - Strategy planning (GPT-4.1-mini)**
- Input: company_profile + agent_persona + candidate_context
- System prompt:
  - Design a 3-message outreach sequence
  - For each message: define intent, approach, tone target
  - Create an objection playbook with 5 common objections and responses
  - Strategy should reflect the company's actual strengths and the persona's style
  - Never use em dashes, en dashes, or double hyphens in any output
  - Output must be valid JSON matching the agent_strategy schema
- Output: agent_strategy JSONB
- Saves to session

**Step 4 - First message generation (GPT-4.1-mini)**
- Input: persona + strategy step 1 + company profile
- System prompt:
  - Generate the opening outreach message as defined by strategy step 1
  - Stay in character per persona config
  - Reference specific company details from the profile
  - Never use em dashes, en dashes, or double hyphens
  - Also generate a reasoning trace explaining the message choices
- Output: message content + reasoning trace
- Saves to messages table with phase='simulation'

Update session status to 'ready'.

**action: "persona" and action: "strategy"** run only their respective step for reconfiguration.

### Function 3: simulate

Candidate simulation engine. The hot path.

```
POST /functions/v1/simulate

Request body:
{
  session_id: string,
  action: "reply" | "reset",
  candidate_message?: string
}

Response (for "reply"):
{
  agent_message: string,
  reasoning: ReasoningTrace,
  candidate_analysis: CandidateAnalysis
}
```

**action: "reply" flow:**

1. Load session (one query: company_profile, agent_persona, agent_strategy)
2. Load simulation messages (one query, ordered by created_at)

3. **Parallel Step A - Candidate analysis (GPT-4.1-nano)**
   - Input: candidate message + conversation history
   - Output:
     - sentiment: enum (enthusiastic / interested / interested_but_cautious / neutral / hesitant / objecting / declining)
     - intent: enum (asking_questions / expressing_interest / raising_objection / making_excuse / negotiating / declining)
     - signals: string[] (specific observations: "mentioned current salary", "used conditional language")

4. **Parallel Step B - Strategy check (GPT-4.1-nano)**
   - Input: candidate analysis context + current strategy + conversation position
   - Output:
     - adjustment_needed: boolean
     - adjustment_rationale: string
     - active_playbook: string | null (which objection playbook entry to activate)

5. **Sequential Step C - Message generation (GPT-4.1)**
   - Input: full context package:
     - agent_persona (personality, traits, style, vocabulary)
     - agent_strategy (current step + any adjustments from Step B)
     - company_profile (grounded facts only)
     - conversation history (all simulation messages)
     - candidate analysis (from Step A)
   - System prompt:
     - You are {agent_persona.name}. Stay in character.
     - Your personality: {agent_persona.summary}
     - Your style rules: {agent_persona.style_notes}
     - Use these words: {vocabulary_do}. Never use: {vocabulary_dont}
     - ONLY reference facts from the company profile. Never invent details.
     - Never use em dashes, en dashes, or double hyphens in any output.
     - Generate the response message AND a reasoning trace.
     - Reasoning trace must include: candidate analysis summary, strategy adjustment rationale, persona compliance check, message rationale.
   - Output: message content + full reasoning JSONB

6. Save candidate message (role='user') and agent message (role='agent' with reasoning) to messages table
7. Return agent message + reasoning trace + candidate analysis

**Parallel execution:**

```typescript
const [candidateAnalysis, strategyCheck] = await Promise.all([
  analyzeCandidateReply(message, history),    // GPT-4.1-nano
  checkStrategyAdjustment(message, strategy)  // GPT-4.1-nano
]);

const agentResponse = await generateResponse(   // GPT-4.1
  candidateAnalysis, strategyCheck, persona, history, profile
);
```

**action: "reset" flow:**
1. Delete all simulation-phase messages for this session
2. Re-run first message generation from strategy step 1
3. Return fresh first message with reasoning

---

## Hallucination prevention

### Five-layer safety net

**Layer 1: Source-tagged extraction**
Every field in company_profile has a field_sources entry tracking where it came from (turn number, uploaded file, or form) and confidence score. Null source = the agent cannot reference that field.

```json
{
  "field_sources": {
    "company_name": { "source": "turn_1", "confidence": 1.0 },
    "remote_policy": { "source": null, "confidence": null }
  }
}
```

**Layer 2: Conversational mirroring**
The config conversation agent mirrors back extracted facts in follow-up questions for passive confirmation. Built into the system prompt, costs nothing extra.

**Layer 3: Low-confidence probing**
When any field has confidence < 0.7, the agent asks a targeted clarifying question instead of assuming. Built into the config conversation system prompt.

**Layer 4: Reconciliation pass**
After config conversation ends, GPT-4.1-mini reviews the full transcript + all per-turn extractions and produces one clean, reconciled profile. Catches compounding errors from per-turn extraction.

**Layer 5: Persona reveal confirmation**
The agent presents its persona and strategy, implicitly asking "does this feel right?" with an explicit "Reconfigure" option. The evaluator catches any remaining misunderstandings.

### Hard rules in every system prompt

```
GROUNDING RULES:
1. You may ONLY reference information the company has explicitly provided
   in this conversation or uploaded document.
2. If you don't know something, say you don't know or ask.
3. NEVER infer facts about the company (founding year, revenue, competitors,
   products, headcount) that were not explicitly stated.
4. NEVER use your training data to fill in details about a company.
5. If a field in the company profile has a null source, do not reference it.
```

### Em dash enforcement

**Prompt-level (in every system prompt):**
```
FORMATTING RULES:
- Never use em dashes (the long dash character).
- Never use en dashes (the medium dash character).
- Never use double hyphens (--).
- Use commas, periods, semicolons, or colons as alternatives.
- This applies to all generated text with zero exceptions.
```

**Code-level sanitizer (runs on every LLM response before returning to frontend):**
```typescript
function sanitizeOutput(text: string): string {
  return text
    .replace(/\u2014/g, ',')   // em dash
    .replace(/\u2013/g, '-')   // en dash
    .replace(/--/g, ',')       // double hyphen
}
```

---

## Frontend architecture

### Component tree

```
App
  AuthProvider (Supabase Google OAuth)
  Router
    LandingPage (unauthenticated)
      HeroSection
      GoogleSignInButton
    
    MainApp (authenticated)
      TopBar
        AppLogo
        UserAvatar
        SessionSelector (if multiple sessions)
        IntegrationsButton (opens integrations panel)
      
      PhaseRouter (based on session.status)
        
        ConfigPhase (status: 'configuring')
          TwoColumnLayout
            LeftColumn (60%)
              ConfigChat
                MessageList
                  AgentMessage
                  UserMessage
                MessageInput
                  TextArea
                  SendButton
                  FileUploadButton
                QuickSetupLink (toggles fallback form)
                QuickSetupForm (hidden by default)
            RightColumn (40%)
              ExtractionPanel
                ExtractionHeader ("Building your profile")
                ExtractedFieldList
                  ExtractedField (filled, with value)
                  GapField (dashed border, label only)
                ProgressIndicator
        
        SynthesisPhase (status: 'synthesizing')
          SynthesisProgress
            StepIndicator ("Analyzing company context...")
            StepIndicator ("Synthesizing agent personality...")
            StepIndicator ("Planning outreach strategy...")
        
        RevealPhase (status: 'ready', before simulation starts)
          AgentRevealCard
            AgentAvatar (coral-to-teal gradient icon)
            AgentName (Instrument Serif)
            PersonalitySummary (italic)
            TraitSliders (formality, warmth, assertiveness, humor)
            VocabularyTags (do/don't)
          StrategyPlanCard
            StrategyStep (x3, with intent + approach)
          ActionButtons
            StartConversationButton (coral, primary CTA)
            ReconfigureButton (ghost/outline)
        
        SimulationPhase (status: 'simulating')
          TwoColumnLayout
            LeftColumn (60%)
              SimulationHeader
                CompanyBadge
                AgentStatusIndicator
              ConversationThread
                AgentMessage (with timestamp)
                CandidateMessage (with timestamp)
              QuickReplySuggestions
                SuggestionChip ("I'm interested, tell me more")
                SuggestionChip ("I'm not looking right now")
                SuggestionChip ("What's the compensation?")
              CandidateInput
                TextArea (placeholder: "Reply as candidate...")
                SendButton
            RightColumn (40%)
              ReasoningPanel
                ReasoningHeader ("Agent reasoning")
                ReasoningBlock (teal border, "CANDIDATE ANALYSIS")
                ReasoningBlock (coral border, "STRATEGY SHIFT")
                ReasoningBlock (gray border, "PERSONA CHECK")
                StrategyPositionIndicator
              AgentConfigSummary (collapsed, expandable)
          BottomBar
            ResetConversationButton
            NewCompanyButton
      
      IntegrationsPanel (slide-over/modal)
        IntegrationRow ("Workday", "Coming Soon")
        IntegrationRow ("Greenhouse", "Coming Soon")
        IntegrationRow ("Lever", "Coming Soon")
        IntegrationRow ("Bullhorn", "Coming Soon")
        IntegrationRow ("LinkedIn RSC", "Coming Soon")
        IntegrationRow ("Custom ATS", "Coming Soon")
        CsvImportRow ("Upload CSV", "Active")
```

### Key frontend files

```
src/
  main.tsx
  App.tsx
  
  lib/
    supabase.ts          (Supabase client init)
    openai.ts            (API call helpers)
    sanitize.ts          (em dash sanitizer)
    types.ts             (TypeScript interfaces for all JSONB shapes)
  
  hooks/
    useSession.ts        (load/create/update session)
    useMessages.ts       (load messages by phase, subscribe to changes)
    useAuth.ts           (Google OAuth flow)
  
  components/
    layout/
      TopBar.tsx
      TwoColumnLayout.tsx
    auth/
      GoogleSignInButton.tsx
      LandingPage.tsx
    config/
      ConfigChat.tsx
      MessageList.tsx
      MessageInput.tsx
      FileUploadButton.tsx
      QuickSetupForm.tsx
      ExtractionPanel.tsx
      ExtractedField.tsx
    synthesis/
      SynthesisProgress.tsx
      StepIndicator.tsx
    reveal/
      AgentRevealCard.tsx
      TraitSlider.tsx
      VocabularyTags.tsx
      StrategyPlanCard.tsx
    simulation/
      ConversationThread.tsx
      CandidateInput.tsx
      QuickReplySuggestions.tsx
      ReasoningPanel.tsx
      ReasoningBlock.tsx
      AgentConfigSummary.tsx
    integrations/
      IntegrationsPanel.tsx
      IntegrationRow.tsx
```

### State management

React Context + useReducer for session state. No Redux, no Zustand (overkill for this scope).

```typescript
// Session context shape
interface SessionState {
  session: Session | null;
  messages: Message[];
  phase: 'landing' | 'configuring' | 'synthesizing' | 'ready' | 'simulating';
  isLoading: boolean;
  error: string | null;
}

type SessionAction =
  | { type: 'SET_SESSION'; payload: Session }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'SET_PHASE'; payload: SessionState['phase'] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };
```

### File upload handling

Frontend parses the file and sends raw text to the Edge Function. No file storage needed.

```typescript
// Supported formats: .txt, .pdf, .docx, .md
async function extractFileText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  
  if (ext === 'txt' || ext === 'md') {
    return await file.text();
  }
  
  if (ext === 'pdf') {
    // Use pdf.js loaded from CDN
    const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map(item => item.str).join(' ') + '\n';
    }
    return text;
  }
  
  if (ext === 'docx') {
    // Use mammoth.js loaded from CDN
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return result.value;
  }
  
  throw new Error('Unsupported file format. Use .txt, .pdf, .docx, or .md');
}
```

---

## UX flow (step by step)

### Phase 0: Landing

User opens the URL. Sees a clean dark page with:
- App name/logo top-left
- Centered: "Build your recruiting agent" headline (Instrument Serif)
- Subline: "Configure an autonomous AI agent that engages candidates with your company's personality."
- "Sign in with Google" button (coral)

User clicks Google sign in. Supabase handles OAuth. Redirect to main app.

### Phase 1: Configuration

**The opening moment:**

A new session is created. The chat view loads with the agent's first message already present:

> "Hey {firstName}, I'm going to be your recruiting agent. Two ways to start:
> Drop a file with your company info, or just tell me: what does your company do?"

The right panel shows the extraction panel with all fields empty (dashed borders): Company, Industry, Size, Culture, Role, Candidate, Pitch, Tone.

**File upload path:**
1. User clicks the upload icon, selects a file
2. Frontend extracts text, calls configure with action: "upload"
3. Right panel animates: extracted fields fill in one by one
4. Agent responds with what it found and asks about the 2-3 missing fields
5. 2-3 more conversation turns to fill gaps
6. Agent says: "Got everything I need. Want to see who I've become?"
7. "Generate Agent" button appears (coral)

**Conversation path:**
1. User types naturally
2. Agent asks 5-6 short targeted questions, one per turn
3. Right panel fills progressively as fields are extracted
4. Agent mirrors back facts in each follow-up for passive confirmation
5. After key fields filled, agent offers to generate
6. "Generate Agent" button appears

**Quick setup fallback:**
- Small "Quick setup" text link below the chat input
- Expands a compact form with 8 fields
- User fills it out, hits "Generate Agent"
- Form collapses, flow continues to synthesis

### Phase 2: Synthesis

The view transitions to a centered progress screen with three sequential steps:

```
Step 1: "Analyzing company context..."      [loading -> checkmark]
Step 2: "Synthesizing agent personality..."  [loading -> checkmark]  
Step 3: "Planning outreach strategy..."      [loading -> checkmark]
```

Each step takes 2-4 seconds (real LLM calls). Progress is real, not fake. The loading indicator uses the teal color with a pulse animation.

Total synthesis time: 6-12 seconds. Acceptable because the visual shows the agent is "working."

### Phase 3: Agent reveal

The persona card and strategy plan appear inline. The evaluator sees:

**Left: Persona Card**
- Agent avatar with coral-to-teal gradient background
- Agent name in Instrument Serif (e.g., "Alex")
- Subtitle: "Agent for PSVIEW"
- Personality summary in italic (2-3 sentences, first person)
- Four trait sliders (formality, warmth, assertiveness, humor) with labeled endpoints
- Vocabulary tags: teal for "uses" words, red for "avoids" words

**Right: Strategy Plan**
- Three cards showing the outreach sequence
- Each card: message number, intent, approach description
- Color-coded top borders (coral for msg 1, teal for msg 2, gray for msg 3)

**Bottom: Two buttons**
- "Start conversation" (coral, primary)
- "Reconfigure" (outline/ghost, secondary)

### Phase 4: Candidate simulation

**The split view:**

**Left panel (60%): Conversation thread**
- Header bar: company name, role, agent status indicator
- The agent's first outreach message is already visible
- Below the thread: candidate input with placeholder "Reply as candidate..."
- Quick-reply suggestion chips above the input:
  - "I'm interested, tell me more"
  - "I'm not looking right now"
  - "What's the compensation?"

**Right panel (40%): Reasoning trace**
- Header: "Agent reasoning" with brain icon in teal
- For each agent message, three trace blocks:
  1. CANDIDATE ANALYSIS (teal left-border): sentiment, intent, signals
  2. STRATEGY SHIFT (coral left-border): what changed and why
  3. PERSONA CHECK (gray left-border): tone match, vocabulary compliance
- Bottom: strategy position indicator ("Message 2 of 3, responding to candidate reply")

**Interaction loop:**
1. Evaluator types a candidate reply (or clicks a quick-reply chip)
2. Candidate message appears in the thread
3. Right panel shows "Analyzing..." with teal pulse
4. Reasoning trace blocks appear sequentially (candidate analysis first, then strategy, then persona check)
5. Agent's response streams into the conversation thread
6. Evaluator can continue the conversation or reset

**Bottom bar:**
- "Reset conversation" button (clears simulation, regenerates opening)
- "New company" button (goes back to Phase 1)
- Collapsible "Agent config" summary (shows current persona at a glance)

---

## Response time budget

| Interaction | DB queries | LLM calls | Target total |
|-------------|-----------|-----------|-------------|
| Config chat turn | 2 (load session + messages) | 2 parallel (nano + 4.1) | ~2.5s |
| File upload extraction | 1 (update session) | 1 (mini) | ~3.5s |
| Full synthesis | 1 (load session) | 4 sequential (mini) | ~9s (with progress) |
| Simulation reply | 2 (load session + messages) | 2 parallel (nano) + 1 sequential (4.1) | ~4.5s |
| Reset conversation | 2 (delete + load) | 1 (mini) | ~3s |

---

## Cost estimate per session

| Step | Model | Input tokens | Output tokens | Cost |
|------|-------|-------------|--------------|------|
| Config conversation (6 turns) | GPT-4.1 | ~15,000 | ~1,500 | ~$0.04 |
| Per-turn extraction (6 turns) | GPT-4.1-nano | ~6,000 | ~600 | ~$0.001 |
| Reconciliation | GPT-4.1-mini | ~3,000 | ~500 | ~$0.002 |
| Persona synthesis | GPT-4.1-mini | ~2,000 | ~800 | ~$0.002 |
| Strategy planning | GPT-4.1-mini | ~2,500 | ~1,000 | ~$0.003 |
| First message gen | GPT-4.1-mini | ~2,000 | ~500 | ~$0.002 |
| Simulation (5 turns) | GPT-4.1 | ~25,000 | ~3,000 | ~$0.07 |
| Candidate analysis (5 turns) | GPT-4.1-nano | ~10,000 | ~500 | ~$0.001 |
| Strategy checks (5 turns) | GPT-4.1-nano | ~10,000 | ~500 | ~$0.001 |
| **Total per session** | | | | **~$0.12** |

For 50 sessions during evaluation: **~$6.00 total.**

---

## Project structure

```
psview-agent-builder/
  README.md
  package.json
  tsconfig.json
  vite.config.ts
  tailwind.config.js
  postcss.config.js
  .env.local                   (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)
  .env.example
  vercel.json
  
  public/
    favicon.svg
  
  src/
    main.tsx
    App.tsx
    index.css                  (Tailwind directives + Google Fonts imports + global styles)
    
    lib/
      supabase.ts              (createClient with env vars)
      api.ts                   (Edge Function call helpers)
      sanitize.ts              (em dash + formatting sanitizer)
      types.ts                 (all TypeScript interfaces)
      constants.ts             (integration providers, quick-reply suggestions)
    
    context/
      AuthContext.tsx           (Google OAuth state)
      SessionContext.tsx        (session + messages state + reducer)
    
    hooks/
      useSession.ts
      useMessages.ts
      useAuth.ts
      useFileParser.ts
    
    components/
      (see component tree above)
    
    pages/
      Landing.tsx
      Main.tsx

  supabase/
    migrations/
      001_create_tables.sql    (all four tables + indexes + RLS)
    functions/
      configure/
        index.ts
      synthesize/
        index.ts
      simulate/
        index.ts
    shared/
      prompts.ts               (all system prompts centralized)
      models.ts                (model routing config)
      sanitize.ts              (server-side sanitizer, same as client)
      types.ts                 (shared types)
```

---

## System prompts (centralized in supabase/shared/prompts.ts)

### Global rules (injected into every prompt)

```
FORMATTING RULES (apply to all output):
- Never use em dashes, en dashes, or double hyphens. Use commas, periods, semicolons, or colons instead.
- Keep responses concise. No filler words or phrases.
- Never say "I'd be happy to" or "Great question" or similar LLM filler.

GROUNDING RULES (apply to all output):
- Only reference information explicitly provided by the company.
- Never infer facts from training data.
- If you don't know something, say so or ask.
```

### Config conversation system prompt

```
You are an AI recruiting agent being configured by a company. Your job is to learn about the company so you can later recruit candidates on their behalf.

CONVERSATION RULES:
- Ask exactly ONE question per turn.
- Keep your total response under 40 words.
- Mirror back one key fact from their previous message before asking your next question.
- Be specific, not open-ended. "What stack does the team use?" not "Tell me about the technical environment."
- If they give a vague answer (e.g., "fast-paced and innovative"), push back: ask for something specific or surprising.
- Use the user's first name naturally.

QUESTION SEQUENCE (adapt based on what you already know):
1. What does the company do? (identity)
2. What's the team like, size, vibe? (culture)
3. What role are you hiring for? (role)
4. What kind of person thrives in this role? (candidate)
5. Why would someone leave their current job for this? (pitch)
6. How should I sound when reaching out, formal, casual, bold? (tone)

Skip any question where the answer is already known from prior turns or an uploaded file.

When all key fields are filled with sufficient detail, end with:
"Got everything I need. Ready to see who I've become for [company_name]?"

{GLOBAL_RULES}
```

### Extraction prompt (per-turn, nano)

```
Extract structured data from the user's message in this company configuration conversation.

Current company profile:
{current_profile}

User's latest message:
{message}

Return ONLY a JSON object with:
- updated_fields: object of field_name: { value: string, confidence: float 0-1 }
- Only include fields that are explicitly stated or very strongly implied
- Confidence 1.0 = directly stated, 0.7-0.9 = strongly implied, below 0.7 = uncertain
- Valid fields: company_name, industry, size, stage, what_they_do, culture, what_makes_people_thrive, role, ideal_candidate, pitch, tone, extras

Do not infer. Do not guess. Only extract what was said.
```

### Persona synthesis prompt

```
You are creating an AI recruiting agent personality based on a company profile.

Company profile:
{company_profile}

Generate a complete agent personality as a JSON object:
{
  "name": "short professional first name, no surname",
  "summary": "2-3 sentence first-person personality description",
  "traits": {
    "formality": 0.0 to 1.0 (0 = very casual, 1 = very formal),
    "warmth": 0.0 to 1.0 (0 = reserved, 1 = very warm),
    "assertiveness": 0.0 to 1.0 (0 = gentle, 1 = bold),
    "humor": 0.0 to 1.0 (0 = serious, 1 = playful)
  },
  "style_notes": ["3-5 specific communication habits"],
  "vocabulary_do": ["4-6 words this agent would naturally use"],
  "vocabulary_dont": ["4-6 words this agent would never use"]
}

The personality must directly reflect the company's culture, not be generic. A scrappy startup agent and a corporate enterprise agent should feel completely different.

{GLOBAL_RULES}
```

### Strategy planning prompt

```
You are planning a candidate outreach strategy for an AI recruiting agent.

Company profile:
{company_profile}

Agent persona:
{agent_persona}

Generate a strategic outreach plan as a JSON object:
{
  "sequence_length": 3,
  "steps": [
    {
      "position": 1,
      "intent": "what this message should accomplish",
      "approach": "how to accomplish it",
      "tone_target": "2-3 word tone description"
    }
  ],
  "objection_playbook": {
    "not_looking": "response strategy",
    "compensation": "response strategy",
    "remote": "response strategy",
    "too_small": "response strategy",
    "happy_where_i_am": "response strategy"
  }
}

The strategy must leverage the company's specific strengths from the profile. Generic strategies that could apply to any company are unacceptable.

{GLOBAL_RULES}
```

### Message generation prompt

```
You are {agent_persona.name}, a recruiting agent for {company_profile.company_name}.

YOUR PERSONALITY:
{agent_persona.summary}

YOUR STYLE RULES:
{agent_persona.style_notes}

VOCABULARY:
- Use naturally: {agent_persona.vocabulary_do}
- Never use: {agent_persona.vocabulary_dont}

COMPANY FACTS (you may ONLY reference these):
{company_profile}

CURRENT STRATEGY STEP:
{current_strategy_step}

CONVERSATION HISTORY:
{conversation_history}

CANDIDATE ANALYSIS (if responding to a reply):
{candidate_analysis}

STRATEGY ADJUSTMENTS (if any):
{strategy_adjustments}

Generate your message and a reasoning trace. Return as JSON:
{
  "message": "your outreach message",
  "reasoning": {
    "candidate_analysis": { "sentiment": "", "intent": "", "signals": [] },
    "strategy_adjustment": "what changed and why, or 'No adjustment needed'",
    "persona_check": { "tone_match": true/false, "vocabulary_compliance": true/false, "notes": "" },
    "message_rationale": "why this specific message, why this tone, why now",
    "strategy_position": "Message N of M, context"
  }
}

CRITICAL: Stay in character. Your message should sound like {agent_persona.name}, not like a generic recruiter. Reference specific details from the company profile. Never make up facts.

{GLOBAL_RULES}
```

---

## Deployment

### Supabase setup

1. Create project on Supabase dashboard
2. Enable Google OAuth in Authentication > Providers
3. Add Google OAuth client ID and secret (from Google Cloud Console)
4. Set redirect URL in Google Cloud Console to Supabase callback URL
5. Run migration SQL in SQL Editor
6. Deploy Edge Functions via Supabase CLI:
   ```bash
   supabase functions deploy configure
   supabase functions deploy synthesize
   supabase functions deploy simulate
   ```
7. Set Edge Function secrets:
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-...
   ```

### Vercel setup

1. Connect GitHub repo to Vercel
2. Set environment variables:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_ANON_KEY
3. Deploy (auto-deploys on push to main)

### Environment variables

```
# .env.local (frontend, prefixed with VITE_)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Supabase Edge Function secrets (set via CLI)
OPENAI_API_KEY=sk-...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## Build order (execution sequence)

### Phase A: Foundation (Day 1, first half)

1. Initialize Vite + React + TypeScript project
2. Install and configure Tailwind with custom theme
3. Set up Supabase client library
4. Create Supabase project, enable Google OAuth
5. Run migration SQL (all 4 tables)
6. Build AuthContext + GoogleSignInButton
7. Build Landing page
8. Test: user can sign in with Google and land on empty main page

### Phase B: Configuration flow (Day 1, second half)

9. Build SessionContext + useSession hook
10. Build ConfigChat component (MessageList, MessageInput)
11. Deploy `configure` Edge Function (chat action only)
12. Build ExtractionPanel with animated field fills
13. Wire up conversation flow: type message > call API > show response > update extraction panel
14. Test: user can have a full config conversation, see extraction panel fill

### Phase C: File upload + Quick setup (Day 1, evening)

15. Add FileUploadButton with text extraction (pdf.js, mammoth.js)
16. Add "upload" action to configure Edge Function
17. Build QuickSetupForm as collapsible fallback
18. Add "quicksetup" action to configure Edge Function
19. Test: all three config paths work and converge

### Phase D: Synthesis + Reveal (Day 2, morning)

20. Deploy `synthesize` Edge Function
21. Build SynthesisProgress with real step indicators
22. Build AgentRevealCard with TraitSliders and VocabularyTags
23. Build StrategyPlanCard
24. Wire up: config complete > synthesis > reveal
25. Test: full flow from config to agent reveal

### Phase E: Simulation (Day 2, afternoon)

26. Deploy `simulate` Edge Function
27. Build ConversationThread for simulation phase
28. Build CandidateInput with QuickReplySuggestions
29. Build ReasoningPanel with ReasoningBlock components
30. Wire up: type candidate reply > call API > show reasoning + response
31. Test: full simulation loop with reasoning traces

### Phase F: Polish (Day 2, evening)

32. Add streaming for simulation responses (Supabase Edge Function ReadableStream)
33. Build IntegrationsPanel (UI only, Coming Soon badges)
34. Add "Reset conversation" and "New company" flows
35. Add "Reconfigure" flow (back to config, re-synthesize)
36. Loading states, error handling, edge cases
37. Mobile responsiveness (basic, not priority)
38. Final testing: run through entire flow as PSVIEW evaluator would

### Phase G: Deploy + Documentation (Day 2, night)

39. Push to GitHub
40. Deploy to Vercel
41. Write README
42. Final smoke test on deployed URL
43. Submit

---

## README template

```markdown
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
2. Copy .env.example to .env.local and fill in Supabase + OpenAI keys
3. npm install
4. npm run dev
5. For Edge Functions: supabase start, then supabase functions serve

## Live demo

[Deployed URL]
```

---

## Risk register

| Risk | Impact | Mitigation |
|------|--------|-----------|
| LLM returns invalid JSON | Pipeline breaks | Wrap every JSON.parse in try/catch, retry once with stricter prompt |
| Em dashes slip through prompts | Violates golden rule | Server-side sanitizer on every response, tested independently |
| Config conversation goes too long | Evaluator loses patience | Hard limit at 8 turns, agent offers to generate after 5 |
| Persona feels generic | Fails the brief | Persona prompt explicitly requires company-specific traits, test with 3 different company types |
| Supabase Edge Function cold start | First request slow (~2s) | Accept it, the synthesis progress screen absorbs the latency |
| OpenAI rate limits | Simulation breaks | Catch 429, show "Agent is thinking..." with retry |
| File parsing fails | Upload path broken | Try/catch with clear error message, fallback to conversation |
| Google OAuth redirect issues | Can't sign in | Test redirect URLs on both localhost and Vercel domain |