import { randomUUID } from 'crypto';
import {
  type LeadMagnetDraft,
  type ViralTopic,
  listLeadMagnets,
  listViralTopics,
  saveLeadMagnets,
  saveViralTopics,
} from './content-studio';

export interface DiscoveryResult {
  viralTopics: ViralTopic[];
  leadMagnets: LeadMagnetDraft[];
  fetchedAt: string;
}

interface HnHit {
  objectID?: string;
  title?: string;
  story_title?: string;
  url?: string;
  story_url?: string;
  points?: number;
  num_comments?: number;
  created_at?: string;
}

const DISCOVERY_QUERIES = [
  'AI automation',
  'AI agents',
  'Claude Code',
  'OpenClaw',
  'workflow automation AI',
  'LLM automation',
];

const RELEVANCE_TERMS = [
  'ai',
  'automation',
  'agent',
  'agents',
  'claude',
  'openclaw',
  'llm',
  'prompt',
  'workflow',
  'autonomous',
  'assistant',
];

const LEAD_MAGNET_TYPES = [
  'Prompt Pack',
  'Checklist',
  'Playbook',
  'Template Bundle',
  'Teardown',
  'Mini Course',
];

const FALLBACK_TOPICS = [
  'How teams are shipping AI automation agents in production',
  'OpenClaw workflows that save 10+ hours per week',
  'AI operations playbooks for service businesses',
  'Practical Claude Code automations that drive pipeline',
];

function parseTeamMembers(): string[] {
  const raw = process.env.TEAM_MEMBERS || '';
  const members = raw
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  return members.length ? members : ['All Team Members'];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function scoreTopic(title: string, engagement: number, query: string): { score: number; reasons: string[] } {
  const lowerTitle = title.toLowerCase();
  const reasons: string[] = [];

  let relevanceHits = 0;
  for (const term of RELEVANCE_TERMS) {
    if (lowerTitle.includes(term)) {
      relevanceHits += 1;
    }
  }

  if (lowerTitle.includes('openclaw')) reasons.push('Direct OpenClaw relevance');
  if (lowerTitle.includes('claude')) reasons.push('Claude/agentic coding relevance');
  if (lowerTitle.includes('automation')) reasons.push('Automation-specific topic');
  if (relevanceHits >= 3) reasons.push('Strong AI keyword density');

  const queryMatch = lowerTitle.includes(query.toLowerCase()) ? 1 : 0;
  const engagementScore = clamp(engagement / 60, 0, 20);
  const relevanceScore = clamp(relevanceHits * 2 + queryMatch * 3, 0, 35);

  const score = Number((engagementScore + relevanceScore).toFixed(2));
  return { score, reasons: reasons.slice(0, 3) };
}

async function fetchHnQuery(query: string): Promise<ViralTopic[]> {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=20`;
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`HN query failed for "${query}" with ${response.status}`);
  }

  const data = (await response.json()) as { hits?: HnHit[] };
  const hits = Array.isArray(data?.hits) ? data.hits : [];

  return hits
    .map((hit) => {
      const title = (hit.title || hit.story_title || '').trim();
      const link = (hit.url || hit.story_url || '').trim();

      if (!title || !link) {
        return null;
      }

      const points = Number(hit.points || 0);
      const comments = Number(hit.num_comments || 0);
      const engagement = points + comments * 1.5;

      const scored = scoreTopic(title, engagement, query);
      const publishedAt = hit.created_at ? new Date(hit.created_at).toISOString() : new Date().toISOString();

      const summary = `Trend signal from Hacker News: ${points} points, ${comments} comments. Query seed: ${query}.`;

      return {
        id: randomUUID(),
        title,
        url: link,
        source: 'Hacker News',
        publishedAt,
        score: scored.score,
        engagement,
        relevanceReasons: scored.reasons.length ? scored.reasons : ['AI/automation keyword match'],
        summary,
        createdAt: new Date().toISOString(),
      } satisfies ViralTopic;
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .filter((item) => item.score >= 6)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

function dedupeTopics(topics: ViralTopic[]): ViralTopic[] {
  const seen = new Set<string>();
  const deduped: ViralTopic[] = [];

  for (const topic of topics) {
    const key = `${topic.url.toLowerCase()}|${topic.title.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(topic);
  }

  return deduped;
}

function buildLeadMagnets(topics: ViralTopic[], fetchedAt: string): LeadMagnetDraft[] {
  const teamMembers = parseTeamMembers();

  return topics.slice(0, 12).map((topic, index) => {
    const magnetType = LEAD_MAGNET_TYPES[index % LEAD_MAGNET_TYPES.length];
    const assignedTo = teamMembers[index % teamMembers.length];

    const strippedTitle = topic.title.replace(/[\s]+/g, ' ').trim();
    const shortTitle = strippedTitle.length > 92 ? `${strippedTitle.slice(0, 89)}...` : strippedTitle;

    return {
      id: randomUUID(),
      type: magnetType,
      assignedTo,
      title: `${magnetType}: ${shortTitle}`,
      targetAudience: 'AI builders, automation freelancers, and technical founders',
      hook: `Use this to turn the ${topic.source} trend into inbound leads for AI/automation services.`,
      outline: [
        'Problem framing: what changed and why teams are paying attention now',
        '3-step implementation plan with real tooling examples',
        'Common failure points and how to avoid them',
        'CTA section that invites readers into your community or call',
      ],
      callToAction: 'Reply with "SYSTEM" to get the full version + templates.',
      basedOnTopicId: topic.id,
      createdAt: fetchedAt,
    };
  });
}

export async function refreshDiscoveryData(): Promise<DiscoveryResult> {
  const fetchedAt = new Date().toISOString();

  const settled = await Promise.allSettled(DISCOVERY_QUERIES.map((query) => fetchHnQuery(query)));
  const collected = settled.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));

  const uniqueTopics = dedupeTopics(collected)
    .sort((a, b) => (a.score === b.score ? b.engagement - a.engagement : b.score - a.score))
    .slice(0, 18)
    .map((topic) => ({ ...topic, createdAt: fetchedAt }));

  if (!uniqueTopics.length) {
    FALLBACK_TOPICS.forEach((title, index) => {
      uniqueTopics.push({
        id: randomUUID(),
        title,
        url: 'https://news.ycombinator.com/',
        source: 'Fallback Trend Feed',
        publishedAt: fetchedAt,
        score: 8 - index * 0.5,
        engagement: 60 - index * 5,
        relevanceReasons: ['AI automation relevance', 'OpenClaw/agentic workflow fit'],
        summary: 'Fallback trend used because live feed returned no results.',
        createdAt: fetchedAt,
      });
    });
  }

  const leadMagnets = buildLeadMagnets(uniqueTopics, fetchedAt);

  await Promise.all([saveViralTopics(uniqueTopics), saveLeadMagnets(leadMagnets)]);

  return {
    viralTopics: uniqueTopics,
    leadMagnets,
    fetchedAt,
  };
}

export async function getDiscoveryData(): Promise<DiscoveryResult> {
  const [viralTopics, leadMagnets] = await Promise.all([listViralTopics(), listLeadMagnets()]);

  const fallbackFetchedAt =
    viralTopics[0]?.createdAt || leadMagnets[0]?.createdAt || new Date(0).toISOString();

  return {
    viralTopics,
    leadMagnets,
    fetchedAt: fallbackFetchedAt,
  };
}
