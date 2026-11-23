import { translateText } from '@/shared/i18n/messages';
import { NextRequest, NextResponse } from 'next/server';
import { sessionToken } from '@/adapters/inbound/http/session-policy';
import { presentCsv } from '@/adapters/inbound/http/presenters/csv';
import { publicError } from '@/adapters/inbound/http/presenters/errors';
import { authentication, reports } from '@/bootstrap/services';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
    const params = request.nextUrl.searchParams;
    const locale = params.get('lang') === 'es' ? 'es' : 'en';
    try {
        const kind = params.get('kind') || 'orders';
        const rows = await reports.reportFor(await authentication.authenticateToken(sessionToken(request)), params.get('scenario') || undefined, params.get('order') || undefined, params.get('from') || undefined, params.get('to') || undefined, kind);
        return new NextResponse(presentCsv(rows, kind, locale), { headers: { 'Content-Type': 'text/csv;charset=utf-8', 'Content-Disposition': 'attachment; filename="workshop-report.csv"', 'Cache-Control': 'no-store' } });
    }
    catch (error) {
        const result = publicError(error);
        return NextResponse.json({ error: translateText(locale, result.error) }, { status: result.status });
    }
}
