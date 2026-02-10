import type { LibraryItem, Platform } from './content-studio';

export interface GenerateInput {
  platform: Platform;
  brief: string;
  audience?: string;
  goal?: string;
  callToAction?: string;
  variants: number;
}

export interface GeneratedPost {
  post: string;
  hook: string;
}

function sanitizeJsonPayload(raw: string): string {
  return raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
}

function readOutputText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') {
    return '';
  }

  const maybeOutputText = (payload as { output_text?: unknown }).output_text;
  if (typeof maybeOutputText === 'string' && maybeOutputText.trim()) {
    return maybeOutputText.trim();
  }

  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    return '';
  }

  const chunks: string[] = [];

  for (const item of output) {
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) {
      continue;
    }

    for (const part of content) {
      const text = (part as { text?: unknown }).text;
      if (typeof text === 'string' && text.trim()) {
        chunks.push(text.trim());
      }
    }
  }

  return chunks.join('\n').trim();
}

function buildPrompt(input: GenerateInput, references: LibraryItem[]) {
  const sampleText = references
    .slice(0, 20)
    .map((item, index) => `Sample ${index + 1}: ${item.text}`)
    .join('\n');

  const platformRule =
    input.platform === 'twitter'
      ? 'Twitter output must be concise, skimmable, and ideally under 280 characters unless a short thread style is clearly better.'
      : 'LinkedIn output should be professional, story-led, and readable with short paragraphs and concrete business value.';

  const systemPrompt = [
    'You are an elite social media strategist for an AI education business.',
    'Your job is to generate high-performing organic posts from a rough brief.',
    'Do not copy sample posts verbatim. Learn style patterns and create original posts.',
    platformRule,
    'Return strict JSON only with this shape: {"posts":[{"hook":"...","post":"..."}]}.',
    `Return exactly ${input.variants} posts.`,
  ].join(' ');

  const userPrompt = [
    `Platform: ${input.platform}`,
    `Goal: ${input.goal || 'Generate leads for paid AI school/community'}`,
    `Audience: ${input.audience || 'Aspiring AI learners, professionals, and founders'}`,
    `Call to action: ${input.callToAction || 'Invite people to learn more or join the community'}`,
    `Brief: ${input.brief}`,
    'Reference style library:',
    sampleText || 'No references yet. Use proven social writing patterns.',
  ].join('\n\n');

  return { systemPrompt, userPrompt };
}

function pickKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 4);

  return Array.from(new Set(words)).slice(0, 8);
}

function fallbackGenerate(input: GenerateInput, references: LibraryItem[]): GeneratedPost[] {
  const keywords = pickKeywords(`${input.brief} ${references.map((r) => r.text).join(' ')}`);
  const keywordChunk = keywords.length ? ` Keywords: ${keywords.join(', ')}.` : '';

  const hookPrefix = input.platform === 'twitter' ? 'Hot take:' : 'Most teams miss this:';

  return Array.from({ length: input.variants }, (_, idx) => {
    const hook = `${hookPrefix} ${input.brief.split('.').at(0)?.slice(0, 90) || 'AI education content can convert better than ads.'}`;

    const post =
      input.platform === 'twitter'
        ? `${hook}\n\n1) ${input.brief}\n2) Show a real outcome\n3) End with one sharp CTA: ${input.callToAction || 'Reply "AI" and I will share the framework.'}${keywordChunk}`
        : `${hook}\n\n${input.brief}\n\nWhat works better for AI education content:\n- Start with one painful problem\n- Share one real framework\n- Add one proof point\n\nCTA: ${input.callToAction || 'Comment AI and I will send the playbook.'}${keywordChunk}`;

    return { hook: `${hook} (${idx + 1})`, post };
  });
}

export async function generatePosts(
  input: GenerateInput,
  references: LibraryItem[]
): Promise<GeneratedPost[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return fallbackGenerate(input, references);
  }

  const { systemPrompt, userPrompt } = buildPrompt(input, references);

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        input: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI request failed with ${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    const raw = readOutputText(payload);

    if (!raw) {
      throw new Error('No text returned from model');
    }

    const parsed = JSON.parse(sanitizeJsonPayload(raw)) as {
      posts?: Array<{ post?: string; hook?: string }>;
    };

    const posts = (parsed.posts || [])
      .map((item) => ({
        hook: (item.hook || '').trim(),
        post: (item.post || '').trim(),
      }))
      .filter((item) => item.post.length > 0)
      .slice(0, input.variants);

    if (!posts.length) {
      throw new Error('No posts parsed from model output');
    }

    return posts;
  } catch (error) {
    console.error('OpenAI generation failed, using fallback', error);
    return fallbackGenerate(input, references);
  }
}
