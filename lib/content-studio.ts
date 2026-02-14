import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

export type Platform = 'twitter' | 'linkedin';

export interface LibraryItem {
  id: string;
  platform: Platform;
  text: string;
  source?: string;
  createdAt: string;
}

export interface CreatorSource {
  id: string;
  name: string;
  platform: Platform;
  url: string;
  createdAt: string;
}

export interface ViralTopic {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  score: number;
  engagement: number;
  relevanceReasons: string[];
  summary: string;
  createdAt: string;
}

export interface LeadMagnetDraft {
  id: string;
  title: string;
  type: string;
  targetAudience: string;
  assignedTo: string;
  hook: string;
  outline: string[];
  callToAction: string;
  basedOnTopicId?: string;
  createdAt: string;
}

export interface AutoPost {
  id: string;
  platform: Platform;
  hook: string;
  post: string;
  basedOnTopicId?: string;
  basedOnLeadMagnetId?: string;
  createdAt: string;
}

interface ContentStore {
  items: LibraryItem[];
  creators: CreatorSource[];
  viralTopics?: ViralTopic[];
  leadMagnets?: LeadMagnetDraft[];
  autoPosts?: AutoPost[];
}

const STORE_PATH = path.join(process.cwd(), 'data', 'content-studio.json');

async function ensureStoreFile() {
  const dir = path.dirname(STORE_PATH);
  await fs.mkdir(dir, { recursive: true });

  try {
    await fs.access(STORE_PATH);
  } catch {
    const initial: ContentStore = { items: [], creators: [] };
    await fs.writeFile(STORE_PATH, JSON.stringify(initial, null, 2), 'utf8');
  }
}

async function readStore(): Promise<ContentStore> {
  await ensureStoreFile();
  const raw = await fs.readFile(STORE_PATH, 'utf8');
  const parsed = JSON.parse(raw) as Partial<ContentStore>;

  const items = Array.isArray(parsed?.items) ? parsed.items : [];
  const creators = Array.isArray(parsed?.creators) ? parsed.creators : [];
  const viralTopics = Array.isArray(parsed?.viralTopics) ? parsed.viralTopics : [];
  const leadMagnets = Array.isArray(parsed?.leadMagnets) ? parsed.leadMagnets : [];
  const autoPosts = Array.isArray(parsed?.autoPosts) ? parsed.autoPosts : [];
  return { items, creators, viralTopics, leadMagnets, autoPosts };
}

async function writeStore(store: ContentStore) {
  await ensureStoreFile();
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
}

export async function listItems(platform?: Platform): Promise<LibraryItem[]> {
  const store = await readStore();

  const filtered = platform
    ? store.items.filter((item) => item.platform === platform)
    : store.items;

  return filtered.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function listViralTopics(): Promise<ViralTopic[]> {
  const store = await readStore();
  const topics = Array.isArray(store.viralTopics) ? store.viralTopics : [];
  return [...topics].sort((a, b) => (a.score === b.score ? (a.createdAt < b.createdAt ? 1 : -1) : b.score - a.score));
}

export async function saveViralTopics(topics: ViralTopic[]): Promise<ViralTopic[]> {
  const store = await readStore();
  store.viralTopics = topics;
  await writeStore(store);
  return topics;
}

export async function listLeadMagnets(): Promise<LeadMagnetDraft[]> {
  const store = await readStore();
  const magnets = Array.isArray(store.leadMagnets) ? store.leadMagnets : [];
  return [...magnets].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function saveLeadMagnets(
  leadMagnets: LeadMagnetDraft[]
): Promise<LeadMagnetDraft[]> {
  const store = await readStore();
  store.leadMagnets = leadMagnets;
  await writeStore(store);
  return leadMagnets;
}

export async function listAutoPosts(platform?: Platform): Promise<AutoPost[]> {
  const store = await readStore();
  const posts = Array.isArray(store.autoPosts) ? store.autoPosts : [];
  const filtered = platform ? posts.filter((post) => post.platform === platform) : posts;
  return [...filtered].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function addAutoPosts(posts: AutoPost[]): Promise<AutoPost[]> {
  if (!posts.length) return [];
  const store = await readStore();
  const existing = Array.isArray(store.autoPosts) ? store.autoPosts : [];
  store.autoPosts = [...posts, ...existing].slice(0, 400);
  await writeStore(store);
  return posts;
}

export async function addItem(
  platform: Platform,
  text: string,
  source?: string
): Promise<LibraryItem> {
  const store = await readStore();

  const item: LibraryItem = {
    id: randomUUID(),
    platform,
    text,
    source,
    createdAt: new Date().toISOString(),
  };

  store.items.push(item);
  await writeStore(store);

  return item;
}

export async function removeItem(id: string): Promise<boolean> {
  const store = await readStore();
  const originalCount = store.items.length;
  store.items = store.items.filter((item) => item.id !== id);

  if (store.items.length === originalCount) {
    return false;
  }

  await writeStore(store);
  return true;
}

export async function listCreators(): Promise<CreatorSource[]> {
  const store = await readStore();
  return [...store.creators].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function addCreator(
  name: string,
  url: string,
  platform: Platform = 'linkedin'
): Promise<CreatorSource> {
  const store = await readStore();
  const normalizedUrl = url.trim();
  const existing = store.creators.find(
    (creator) => creator.url.toLowerCase() === normalizedUrl.toLowerCase()
  );

  if (existing) {
    return existing;
  }

  const creator: CreatorSource = {
    id: randomUUID(),
    name: name.trim(),
    platform,
    url: normalizedUrl,
    createdAt: new Date().toISOString(),
  };

  store.creators.push(creator);
  await writeStore(store);
  return creator;
}

export async function removeCreator(id: string): Promise<boolean> {
  const store = await readStore();
  const originalCount = store.creators.length;
  store.creators = store.creators.filter((creator) => creator.id !== id);

  if (store.creators.length === originalCount) {
    return false;
  }

  await writeStore(store);
  return true;
}
