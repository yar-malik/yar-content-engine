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
  platform: 'linkedin';
  url: string;
  createdAt: string;
}

interface ContentStore {
  items: LibraryItem[];
  creators: CreatorSource[];
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
  return { items, creators };
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

export async function addCreator(name: string, url: string): Promise<CreatorSource> {
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
    platform: 'linkedin',
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
