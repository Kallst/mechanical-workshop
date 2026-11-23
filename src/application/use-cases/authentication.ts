import type { Actor } from '../../domain/types';
import { DomainError, ensure } from '../../domain/engine';
import { createBaseline, employees } from '../../domain/seed';
import type { IdentityRepository, IdentityUnitOfWork } from '../ports/identity-repository';
import type { SecurityPort } from '../ports/security';
export interface AuthenticationSettings {
    allowDemoSignup: boolean;
    maxDemoWorkspaces: number;
}
export function createAuthenticationService(repository: IdentityRepository, security: SecurityPort, settings: AuthenticationSettings) {
    const dummyHash = security.hashPassword(security.token());
    async function provision(unit: IdentityUnitOfWork, code: string, name: string, password: string) {
        const workspaceId = security.uuid();
        await unit.createWorkspace(workspaceId, code, name);
        let adminId = '';
        for (const employee of employees) {
            const id = security.uuid();
            if (employee.id === 'tamara')
                adminId = id;
            await unit.createUser({ id, workspaceId, username: employee.id, name: employee.name, role: employee.role, passwordHash: await security.hashPassword(password) });
        }
        const scenarioId = security.uuid(), state = createBaseline(security.now());
        await unit.createScenario(scenarioId, workspaceId, 'Workshop demonstration', state);
        await unit.appendAudit({ workspaceId, scenarioId, actorId: adminId, actorName: 'Tamara', action: 'workspace.created', details: { source: 'Explicit synthetic baseline', code }, minute: state.clock.minute });
        return { workspaceId, adminId, scenarioId, code };
    }
    async function sessionFor(userId: string) { const token = security.token(); await repository.createSession(userId, security.digest(token), 8 * 3600); return token; }
    async function login(code: string, username: string, password: string) {
        ensure(code.length >= 3 && code.length <= 40 && username.length <= 40 && password.length <= 128, 'Invalid sign-in details.', 400);
        const accountKey = security.digest(`${code.toLowerCase()}:${username.toLowerCase()}`);
        const result = await repository.transaction(async (unit) => {
            await unit.lockAccount(accountKey);
            await unit.removeExpiredAttempts(24 * 3600);
            if (await unit.recentAttempts(accountKey, 15 * 60) >= 20)
                return { failure: true };
            await unit.recordAttempt(accountKey);
            const account = await unit.findAccount(code.toLowerCase(), username.toLowerCase());
            const correct = await security.verifyPassword(password, account?.passwordHash || await dummyHash);
            if (!account || account.lockedUntil !== null && account.lockedUntil > security.now())
                return { failure: true };
            if (!correct) {
                const failures = (account.lockedUntil !== null ? 0 : account.failedAttempts) + 1;
                await unit.recordFailedLogin(account.id, failures, failures >= 5 ? 15 * 60 : null);
                return { failure: true };
            }
            await unit.clearFailedLogins(account.id);
            return { failure: false, userId: account.id };
        });
        if (result.failure || !result.userId)
            throw new DomainError('Unable to sign in. Check your details or retry after the 15-minute lock window.', 401);
        return sessionFor(result.userId);
    }
    async function register(name: string, password: string) {
        ensure(settings.allowDemoSignup, 'Personal demonstration creation is disabled.', 403);
        ensure(name.trim().length >= 2 && name.trim().length <= 100 && password.length >= 12 && password.length <= 128, 'Use a workspace name and a password of 12–128 characters.');
        const record = await repository.transaction(async (unit) => { await unit.lockProvisioning(); ensure(await unit.workspaceCount() < settings.maxDemoWorkspaces, 'The demonstration workspace limit has been reached.', 429); return provision(unit, security.workspaceCode(), name.trim(), password); });
        return { token: await sessionFor(record.adminId), code: record.code };
    }
    async function authenticateToken(token: string | undefined): Promise<Actor> { ensure(token && /^[\w-]{43}$/.test(token), 'Sign in to continue.', 401); const actor = await repository.actorForSession(security.digest(token)); ensure(actor, 'Your session has expired. Sign in again.', 401); return actor; }
    async function logoutToken(token: string | undefined) { if (token !== undefined)
        await repository.revokeSession(security.digest(token)); }
    async function seedDefaultWorkspace(password: string) { return repository.transaction(async (unit) => { await unit.lockProvisioning(); if (await unit.workspaceExists('workshop-demo'))
        return { created: false }; await provision(unit, 'workshop-demo', 'Heavy vehicle workshop', password); return { created: true }; }); }
    return { login, register, authenticateToken, logoutToken, seedDefaultWorkspace };
}
export type AuthenticationService = ReturnType<typeof createAuthenticationService>;
