import { NextResponse } from 'next/server';
import { addItem, listItems } from '../../../lib/content-studio';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const platformParam = searchParams.get('platform');
    const platform =
      platformParam === 'twitter' || platformParam === 'linkedin'
        ? platformParam
        : undefined;

    const items = await listItems(platform);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Failed to list items', error);
    return NextResponse.json({ error: 'Failed to load items' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      platform?: 'twitter' | 'linkedin';
      text?: string;
      source?: string;
    };

    const platform = body.platform;
    const text = (body.text || '').trim();
    const source = (body.source || '').trim();

    if (!platform || (platform !== 'twitter' && platform !== 'linkedin')) {
      return NextResponse.json({ error: 'valid platform is required' }, { status: 400 });
    }

    if (!text) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const item = await addItem(platform, text, source || undefined);
    return NextResponse.json({ item });
  } catch (error) {
    console.error('Failed to add item', error);
    return NextResponse.json({ error: 'Failed to add item' }, { status: 500 });
  }
}
