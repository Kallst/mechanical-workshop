import { z } from 'zod';
import { DomainError } from '../../../../domain/engine';
export function publicError(error: unknown) {
    if (error instanceof DomainError)
        return { error: error.message, status: error.status };
    if (error instanceof z.ZodError || error instanceof SyntaxError)
        return { error: 'The request format is invalid.', status: 400 };
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    if (code === '23505')
        return { error: 'This record already exists. Refresh and try again.', status: 409 };
    console.error('Workshop request failed:', error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[database]') : 'Unknown error');
    return { error: 'The operation could not be completed. No partial change was saved.', status: 500 };
}
