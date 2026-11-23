import { NextRequest, NextResponse } from 'next/server';
import { assertOrigin, sessionToken, COOKIE_NAME } from '@/adapters/inbound/http/session-policy';
import { authentication, workshop } from '@/bootstrap/services';
import { publicError } from '@/adapters/inbound/http/presenters/errors';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: NextRequest) {
    try {
        return NextResponse.json(await workshop.contextFor(await authentication.authenticateToken(sessionToken(request))), { headers: { 'Cache-Control': 'no-store' } });
    }
    catch (error) {
        const result = publicError(error);
        return NextResponse.json({ error: result.error }, { status: result.status });
    }
}
export async function POST(request: NextRequest) {
    try {
        assertOrigin(request, process.env.APP_ORIGIN);
        const raw = await request.text();
        if (raw.length > 4096)
            return NextResponse.json({ error: 'Sign-in request is too large.' }, { status: 413 });
        const body = JSON.parse(raw);
        let token: string;
        let code: string | undefined;
        if (body.action === 'register') {
            const result = await authentication.register(String(body.name || ''), String(body.password || ''));
            token = result.token;
            code = result.code;
        }
        else {
            token = await authentication.login(String(body.code || ''), String(body.username || ''), String(body.password || ''));
        }
        await authentication.logoutToken(sessionToken(request));
        const response = NextResponse.json({ success: true, code });
        response.cookies.set(COOKIE_NAME, token, { httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: 'lax', path: '/', maxAge: 8 * 3600 });
        return response;
    }
    catch (error) {
        const result = publicError(error);
        return NextResponse.json({ error: result.error }, { status: result.status });
    }
}
export async function DELETE(request: NextRequest) {
    try {
        assertOrigin(request, process.env.APP_ORIGIN);
        await authentication.logoutToken(sessionToken(request));
        const response = NextResponse.json({ success: true });
        response.cookies.set(COOKIE_NAME, '', { httpOnly: true, secure: process.env.COOKIE_SECURE === 'true', sameSite: 'lax', path: '/', maxAge: 0 });
        return response;
    }
    catch (error) {
        const result = publicError(error);
        return NextResponse.json({ error: result.error }, { status: result.status });
    }
}
