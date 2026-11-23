import type { Actor, Role, WorkshopState } from '../../domain/types';
import type { AuditEntry } from './workshop-repository';
export interface LoginAccount {
    id: string;
    passwordHash: string;
    failedAttempts: number;
    lockedUntil: number | null;
}
export interface NewUser {
    id: string;
    workspaceId: string;
    username: string;
    name: string;
    role: Role;
    passwordHash: string;
}
export interface IdentityUnitOfWork {
    lockAccount(key: string): Promise<void>;
    removeExpiredAttempts(retentionSeconds: number): Promise<void>;
    recentAttempts(key: string, windowSeconds: number): Promise<number>;
    recordAttempt(key: string): Promise<void>;
    findAccount(code: string, username: string): Promise<LoginAccount | undefined>;
    recordFailedLogin(id: string, failures: number, lockSeconds: number | null): Promise<void>;
    clearFailedLogins(id: string): Promise<void>;
    lockProvisioning(): Promise<void>;
    workspaceCount(): Promise<number>;
    workspaceExists(code: string): Promise<boolean>;
    createWorkspace(id: string, code: string, name: string): Promise<void>;
    createUser(user: NewUser): Promise<void>;
    createScenario(id: string, workspaceId: string, name: string, state: WorkshopState): Promise<void>;
    appendAudit(entry: AuditEntry): Promise<void>;
}
export interface IdentityRepository {
    transaction<T>(operation: (unit: IdentityUnitOfWork) => Promise<T>): Promise<T>;
    createSession(userId: string, tokenHash: string, ttlSeconds: number): Promise<void>;
    actorForSession(tokenHash: string): Promise<Actor | undefined>;
    revokeSession(tokenHash: string): Promise<void>;
}
