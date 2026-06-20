export const GLOBAL_RULES = `FORMATTING RULES (apply to all output):
- Never use em dashes, en dashes, or double hyphens. Use commas, periods, semicolons, or colons instead.
- Keep responses concise. No filler words or phrases.
- Never say "I'd be happy to" or "Great question" or similar LLM filler.

GROUNDING RULES (apply to all output):
- You may ONLY reference information the company has explicitly provided in this conversation or uploaded document.
- If you don't know something, say you don't know or ask.
- NEVER infer facts about the company (founding year, revenue, competitors, products, headcount) that were not explicitly stated.
- NEVER use your training data to fill in details about a company.
- If a field in the company profile has a null source, do not reference it.`;

export const CONFIG_CONVERSATION_PROMPT = `You are an AI recruiting agent being configured by a company. Your job is to learn about the company so you can later recruit candidates on their behalf.

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

${GLOBAL_RULES}`;

export function extractionPrompt(currentProfile: string, message: string): string {
  return `Extract structured data from the user's message in this company configuration conversation.

Current company profile:
${currentProfile}

User's latest message:
${message}

Return ONLY a JSON object with:
- updated_fields: object of field_name: { value: string, confidence: float 0-1 }
- Only include fields that are explicitly stated or very strongly implied
- Confidence 1.0 = directly stated, 0.7-0.9 = strongly implied, below 0.7 = uncertain
- Valid fields: company_name, industry, size, stage, what_they_do, culture, what_makes_people_thrive, role, ideal_candidate, pitch, tone, extras

Do not infer. Do not guess. Only extract what was said.

${GLOBAL_RULES}`;
}

export function personaSynthesisPrompt(companyProfile: string): string {
  return `You are creating an AI recruiting agent personality based on a company profile.

Company profile:
${companyProfile}

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

${GLOBAL_RULES}`;
}

export function strategyPlanningPrompt(
  companyProfile: string,
  agentPersona: string,
): string {
  return `You are planning a candidate outreach strategy for an AI recruiting agent.

Company profile:
${companyProfile}

Agent persona:
${agentPersona}

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

${GLOBAL_RULES}`;
}

export function messageGenerationPrompt(params: {
  agentPersona: string;
  companyProfile: string;
  currentStrategyStep: string;
  conversationHistory: string;
  candidateAnalysis: string;
  strategyAdjustments: string;
  candidateProfile?: string;
}): string {
  const candidateSection = params.candidateProfile
    ? `\nCANDIDATE PROFILE (personalize outreach using only these facts):\n${params.candidateProfile}\n`
    : '\nCANDIDATE PROFILE: Simulated preview — employer is testing manually. Stay generic on candidate-specific claims.\n';

  return `You are a recruiting agent for the company described below.

YOUR PERSONALITY AND STYLE:
${params.agentPersona}

COMPANY FACTS (you may ONLY reference these):
${params.companyProfile}
${candidateSection}
CURRENT STRATEGY STEP:
${params.currentStrategyStep}

CONVERSATION HISTORY:
${params.conversationHistory}

CANDIDATE ANALYSIS (if responding to a reply):
${params.candidateAnalysis}

STRATEGY ADJUSTMENTS (if any):
${params.strategyAdjustments}

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

CRITICAL: Stay in character. Reference specific details from the company profile. Never make up facts.

${GLOBAL_RULES}`;
}

export function reconciliationPrompt(
  transcript: string,
  profile: string,
): string {
  return `Review this company configuration conversation and produce one reconciled company profile.

Full transcript:
${transcript}

Current extracted profile:
${profile}

Return ONLY valid JSON matching the company profile schema with field_sources for every populated field. Resolve contradictions. Remove uncertain fields with no clear source.

${GLOBAL_RULES}`;
}

export function uploadExtractionPrompt(fileText: string): string {
  return `Extract all company profile fields from this document.

Document:
${fileText}

Return ONLY valid JSON with fields: company_name, industry, size, stage, what_they_do, culture, what_makes_people_thrive, role, ideal_candidate, pitch, tone, extras, field_sources.
Tag all sources as "uploaded_file" with appropriate confidence scores.

${GLOBAL_RULES}`;
}

export function uploadFollowUpPrompt(
  profile: string,
  gaps: string[],
  companyName: string,
): string {
  return `You are an AI recruiting agent. A company just uploaded a document with their info.

Extracted profile:
${profile}

Missing fields: ${gaps.length > 0 ? gaps.join(', ') : 'none, profile is complete'}

Write ONE short conversational reply under 40 words.
- Mention 1 specific detail you noticed from their file about ${companyName}
- If fields are missing, ask about the most important gap with one question
- If profile is complete, say you are ready to show who you have become for ${companyName}
- Be warm and direct, not robotic

${GLOBAL_RULES}`;
}

export function candidateAnalysisPrompt(
  message: string,
  history: string,
): string {
  return `Analyze this candidate message in a recruiting conversation.

Conversation history:
${history}

Latest candidate message:
${message}

Return ONLY JSON:
{
  "sentiment": "enthusiastic|interested|interested_but_cautious|neutral|hesitant|objecting|declining",
  "intent": "asking_questions|expressing_interest|raising_objection|making_excuse|negotiating|declining",
  "signals": ["specific observations"]
}

${GLOBAL_RULES}`;
}

export function strategyCheckPrompt(
  analysis: string,
  strategy: string,
  position: string,
): string {
  return `Given candidate analysis and current strategy, determine if adjustment is needed.

Candidate analysis:
${analysis}

Current strategy:
${strategy}

Conversation position:
${position}

Return ONLY JSON:
{
  "adjustment_needed": boolean,
  "adjustment_rationale": "string",
  "active_playbook": "not_looking|compensation|remote|too_small|happy_where_i_am|null"
}

${GLOBAL_RULES}`;
}

export function candidateSummaryPrompt(
  companyProfile: string,
  agentPersona: string,
  messages: string,
): string {
  return `You are an expert recruiting analyst reviewing a conversation between a recruiting agent and a candidate.

Company context:
${companyProfile}

Agent persona:
${agentPersona}

Full conversation:
${messages}

Generate a candidate assessment as JSON:
{
  "interest_level": "high" | "medium" | "low" | "declined",
  "interest_label": "one-line summary of where the candidate stands",
  "key_motivators": ["what excited them, 2-4 items"],
  "concerns": ["what worried them or they pushed back on, 1-3 items"],
  "signals_detected": ["specific behavioral observations from the conversation, 3-5 items"],
  "recommended_next_step": "one specific, actionable recommendation",
  "engagement_score": 0.0 to 1.0,
  "conversation_turns": number,
  "objections_raised": ["list of objection categories triggered"],
  "objections_resolved": ["which objections were successfully addressed"]
}

Base every assessment on what the candidate actually said. Do not infer personality traits that were not demonstrated. Do not speculate beyond the conversation. If something is unclear, say so.

${GLOBAL_RULES}`;
}

export function resumeExtractionPrompt(): string {
  return `Extract candidate profile fields from this resume.

Return ONLY valid JSON with these fields:
{
  "full_name": "string or null",
  "current_role": "most recent job title and company, e.g. Senior Engineer at Stripe",
  "linkedin_url": "LinkedIn URL if present, else null",
  "skills": ["array of technical and professional skills, 5-15 items"],
  "experience_years": number (total years of professional experience, estimate if needed),
  "location": "city/region if stated, else null",
  "open_to_roles": ["job titles or role types the candidate seems suited for, 2-5 items"]
}

Rules:
- Only include fields explicitly stated or very strongly implied
- skills should be concise labels (React, TypeScript, not full sentences)
- experience_years should be a reasonable integer estimate
- open_to_roles should reflect seniority and domain from the resume

${GLOBAL_RULES}`;
}
