import { translateText } from '@/i18n/messages';
import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/server/auth';
import { csvFor, publicError } from '@/server/workshop';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const csv = await csvFor(await authenticate(request), params.get('scenario') || undefined, params.get('order') || undefined, params.get('from') || undefined, params.get('to') || undefined, params.get('kind') || 'orders', params.get('lang') === 'es' ? 'es' : 'en');
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv;charset=utf-8', 'Content-Disposition': 'attachment; filename="workshop-report.csv"', 'Cache-Control': 'no-store' } });
  } catch (error) { const result = publicError(error); return NextResponse.json({ error: translateText(request.nextUrl.searchParams.get('lang')==='es'?'es':'en', result.error) }, { status: result.status }); }
}
