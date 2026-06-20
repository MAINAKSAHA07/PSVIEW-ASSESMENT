import { MODELS } from '../shared/models.ts';
import { sanitizeObject, sanitizeOutput } from '../shared/sanitize.ts';

export async function callOpenAI(
  model: string,
  systemPrompt: string,
  userContent: string,
  jsonMode = false,
): Promise<string> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      temperature: 0.7,
    }),
  });

  if (response.status === 429) {
    throw new Error('Rate limited. Please try again in a moment.');
  }

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI error: ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content ?? '';
  return sanitizeOutput(content);
}

export async function parseJSON<T>(
  text: string,
  retry: () => Promise<string>,
): Promise<T> {
  try {
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    return sanitizeObject(JSON.parse(cleaned) as T);
  } catch {
    const retried = await retry();
    const cleaned = retried.replace(/```json\n?|\n?```/g, '').trim();
    return sanitizeObject(JSON.parse(cleaned) as T);
  }
}

export { MODELS };
