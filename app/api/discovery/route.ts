import { NextResponse } from 'next/server';
import { getDiscoveryData, refreshDiscoveryData } from '../../../lib/discovery';

export async function GET() {
  try {
    const data = await getDiscoveryData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to load discovery data', error);
    return NextResponse.json(
      { error: 'Failed to load discovery data' },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const data = await refreshDiscoveryData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to refresh discovery data', error);
    return NextResponse.json(
      { error: 'Failed to refresh discovery data' },
      { status: 500 }
    );
  }
}
