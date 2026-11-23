import { Pool, type PoolClient } from 'pg';
const globals = globalThis as unknown as {
    workshopPool?: Pool;
};
export function pool(): Pool {
    if (!process.env.DATABASE_URL)
        throw new Error('DATABASE_URL is required.');
    if (!globals.workshopPool) {
        globals.workshopPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
        globals.workshopPool.on('error', () => console.error('An idle database connection was interrupted. New requests will reconnect.'));
    }
    return globals.workshopPool;
}
export async function transaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool().connect();
    try {
        await client.query('BEGIN');
        const result = await operation(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
