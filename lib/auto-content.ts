import { randomUUID } from 'crypto';
import { generatePosts } from './generation';
import {
  addAutoPosts,
  listAutoPosts,
  listItems,
  type AutoPost,
  type LeadMagnetDraft,
  type Platform,
  type ViralTopic,
} from './content-studio';
import { getDiscoveryData, refreshDiscoveryData, type DiscoveryResult } from './discovery';

interface AutoContentResult extends DiscoveryResult {
  newPosts: AutoPost[];
  autoPosts: AutoPost[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function rotate<T>(items: T[], offset: number): T[] {
  if (!items.length) return [];
  const normalized = ((offset % items.length) + items.length) % items.length;
  return [...items.slice(normalized), ...items.slice(0, normalized)];
}

function buildBrief(topic: ViralTopic, magnet: LeadMagnetDraft, platform: Platform): string {
  const platformAngle =
    platform === 'twitter'
      ? 'Make it punchy with one clear contrarian angle and one practical takeaway.'
      : 'Make it story-led with practical business context and a strong closing insight.';

  return [
    `Topic: ${topic.title}`,
    `Lead magnet angle: ${magnet.title}`,
    `Audience: AI automation builders, OpenClaw users, agency operators`,
    `Value: show a clear implementation path and why this matters now`,
    platformAngle,
  ].join(' ');
}

async function generateForPlatform(
  platform: Platform,
  topics: ViralTopic[],
  leadMagnets: LeadMagnetDraft[],
  count: number
): Promise<AutoPost[]> {
  const references = await listItems(platform);
  const timestampSeed = Date.now();
  const rotatedTopics = rotate(topics, timestampSeed % Math.max(topics.length, 1));
  const rotatedMagnets = rotate(leadMagnets, timestampSeed % Math.max(leadMagnets.length, 1));
  const fallbackMagnet: LeadMagnetDraft = {
    id: randomUUID(),
    title: 'AI Automation Playbook',
    type: 'Playbook',
    targetAudience: 'AI builders and operators',
    assignedTo: 'All Team Members',
    hook: 'Turn trends into executable systems',
    outline: ['Problem', 'System', 'Execution'],
    callToAction: 'Reply SYSTEM for the full version',
    createdAt: new Date().toISOString(),
  };

  const selectedTopics = rotatedTopics.slice(0, count);

  const generated = await Promise.all(
    selectedTopics.map(async (topic, index) => {
      const magnet =
        rotatedMagnets[index % Math.max(rotatedMagnets.length, 1)] || fallbackMagnet;

      const brief = buildBrief(topic, magnet, platform);
      const [draft] = await generatePosts(
        {
          platform,
          brief,
          audience: 'AI and AI automation founders, operators, and creators',
          goal: 'Generate qualified inbound leads for AI automation services and education',
          callToAction: 'Reply "SYSTEM" to get the full lead magnet and implementation template',
          variants: 1,
        },
        references
      );

      if (!draft?.post) {
        return null;
      }

      return {
        id: randomUUID(),
        platform,
        hook: draft.hook || topic.title,
        post: draft.post,
        basedOnTopicId: topic.id,
        basedOnLeadMagnetId: magnet.id,
        createdAt: new Date().toISOString(),
      } satisfies AutoPost;
    })
  );

  return generated.filter((item): item is AutoPost => Boolean(item));
}

export async function getAutoContent(): Promise<AutoContentResult> {
  const [discoveryData, autoPosts] = await Promise.all([getDiscoveryData(), listAutoPosts()]);

  return {
    ...discoveryData,
    newPosts: [],
    autoPosts,
  };
}

export async function generateAutoContent(requestedCount?: number): Promise<AutoContentResult> {
  const countPerPlatform = clamp(Number(requestedCount) || 3, 1, 8);

  const discoveryData = await refreshDiscoveryData();
  const topics = discoveryData.viralTopics;
  const leadMagnets = discoveryData.leadMagnets;

  const [twitterPosts, linkedinPosts] = await Promise.all([
    generateForPlatform('twitter', topics, leadMagnets, countPerPlatform),
    generateForPlatform('linkedin', topics, leadMagnets, countPerPlatform),
  ]);

  const newPosts = [...twitterPosts, ...linkedinPosts];
  await addAutoPosts(newPosts);

  const autoPosts = await listAutoPosts();

  return {
    ...discoveryData,
    newPosts,
    autoPosts,
  };
}
