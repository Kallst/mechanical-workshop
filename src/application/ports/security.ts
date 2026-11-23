export interface SecurityPort {
    uuid(): string;
    token(): string;
    workspaceCode(): string;
    digest(value: string): string;
    hashPassword(password: string): Promise<string>;
    verifyPassword(password: string, encoded: string): Promise<boolean>;
    now(): number;
}
