import { NextRequest, NextResponse } from 'next/server';
import { assertOrigin, authenticate } from '@/server/auth';
import { commandFor, publicError, snapshotFor } from '@/server/workshop';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try { return NextResponse.json(await snapshotFor(await authenticate(request), request.nextUrl.searchParams.get('scenario') || undefined), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { const result = publicError(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
}
export async function POST(request: NextRequest) {
  try { assertOrigin(request); const actor = await authenticate(request); const raw = await request.text(); if (raw.length > 65536) return NextResponse.json({ error: 'Command is too large.' }, { status: 413 }); return NextResponse.json(await commandFor(actor, JSON.parse(raw))); }
  catch (error) { const result = publicError(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
}
