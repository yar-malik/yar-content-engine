import { NextResponse } from 'next/server';
import { generateAutoContent, getAutoContent } from '../../../lib/auto-content';

export async function GET() {
  try {
    const data = await getAutoContent();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to load auto content', error);
    return NextResponse.json({ error: 'Failed to load auto content' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { count?: number };
    const data = await generateAutoContent(body.count);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to generate auto content', error);
    return NextResponse.json({ error: 'Failed to generate auto content' }, { status: 500 });
  }
}
