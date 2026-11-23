import { NextRequest, NextResponse } from 'next/server';
import { assertOrigin, sessionToken } from '@/adapters/inbound/http/session-policy';
import { authentication, workshop } from '@/bootstrap/services';
import { publicError } from '@/adapters/inbound/http/presenters/errors';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
    try {
        return NextResponse.json(await workshop.snapshotFor(await authentication.authenticateToken(sessionToken(request)), request.nextUrl.searchParams.get('scenario') || undefined), { headers: { 'Cache-Control': 'no-store' } });
    }
    catch (error) {
        const result = publicError(error);
        return NextResponse.json({ error: result.error }, { status: result.status });
    }
}
export async function POST(request: NextRequest) {
    try {
        assertOrigin(request, process.env.APP_ORIGIN);
        const actor = await authentication.authenticateToken(sessionToken(request));
        const raw = await request.text();
        if (raw.length > 65536)
            return NextResponse.json({ error: 'Command is too large.' }, { status: 413 });
        return NextResponse.json(await workshop.commandFor(actor, JSON.parse(raw)));
    }
    catch (error) {
        const result = publicError(error);
        return NextResponse.json({ error: result.error }, { status: result.status });
    }
}
