import { NextResponse } from 'next/server';
import { generatePosts } from '../../../lib/generation';
import { listItems } from '../../../lib/content-studio';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      platform?: 'twitter' | 'linkedin';
      brief?: string;
      audience?: string;
      goal?: string;
      callToAction?: string;
      variants?: number;
    };

    const platform = body.platform;
    const brief = (body.brief || '').trim();
    const variantsRaw = Number(body.variants || 3);
    const variants = Number.isFinite(variantsRaw)
      ? Math.max(1, Math.min(variantsRaw, 10))
      : 3;

    if (!platform || (platform !== 'twitter' && platform !== 'linkedin')) {
      return NextResponse.json({ error: 'valid platform is required' }, { status: 400 });
    }

    if (!brief) {
      return NextResponse.json({ error: 'brief is required' }, { status: 400 });
    }

    const references = await listItems(platform);
    const posts = await generatePosts(
      {
        platform,
        brief,
        audience: body.audience,
        goal: body.goal,
        callToAction: body.callToAction,
        variants,
      },
      references
    );

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Failed to generate posts', error);
    return NextResponse.json({ error: 'Failed to generate posts' }, { status: 500 });
  }
}
