import { NextResponse } from 'next/server';
import { addCreator, listCreators } from '../../../lib/content-studio';

export async function GET() {
  try {
    const creators = await listCreators();
    return NextResponse.json({ creators });
  } catch (error) {
    console.error('Failed to list creators', error);
    return NextResponse.json({ error: 'Failed to load creators' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      url?: string;
      platform?: 'twitter' | 'linkedin';
    };

    const name = (body.name || '').trim();
    const url = (body.url || '').trim();
    const platform = body.platform === 'twitter' ? 'twitter' : 'linkedin';

    if (!name || !url) {
      return NextResponse.json(
        { error: 'name and url are required' },
        { status: 400 }
      );
    }

    const creator = await addCreator(name, url, platform);
    return NextResponse.json({ creator });
  } catch (error) {
    console.error('Failed to add creator', error);
    return NextResponse.json({ error: 'Failed to add creator' }, { status: 500 });
  }
}
