import { NextRequest, NextResponse } from 'next/server';
import { assertOrigin, authenticate, COOKIE_NAME, login, logout, register } from '@/server/auth';
import { contextFor, publicError } from '@/server/workshop';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try { return NextResponse.json(await contextFor(await authenticate(request)), { headers: { 'Cache-Control': 'no-store' } }); }
  catch (error) { const result = publicError(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
}
export async function POST(request: NextRequest) {
  try {
    assertOrigin(request); const raw = await request.text(); if (raw.length > 4096) return NextResponse.json({ error: 'Sign-in request is too large.' }, { status: 413 });
    const body = JSON.parse(raw); let token: string; let code: string | undefined;
    if (body.action === 'register') { const result = await register(String(body.name || ''), String(body.password || '')); token = result.token; code = result.code; }
    else { token = await login(String(body.code || ''), String(body.username || ''), String(body.password || '')); }
    await logout(request);
    const response = NextResponse.json({ success: true, code });
    response.cookies.set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: 'lax', path: '/', maxAge: 8 * 3600 }); return response;
  } catch (error) { const result = publicError(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
}
export async function DELETE(request: NextRequest) {
  try { assertOrigin(request); await logout(request); const response = NextResponse.json({ success: true }); response.cookies.set(COOKIE_NAME, '', { httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: 'lax', path: '/', maxAge: 0 }); return response; }
  catch (error) { const result = publicError(error); return NextResponse.json({ error: result.error }, { status: result.status }); }
}
