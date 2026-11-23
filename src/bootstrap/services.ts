import { PostgresWorkshopRepository } from '../adapters/outbound/persistence/postgres/workshop-repository';
import { PostgresIdentityRepository } from '../adapters/outbound/persistence/postgres/identity-repository';
import { nodeSecurity } from '../adapters/outbound/security/node-security';
import { createWorkshopService } from '../application/use-cases/workshop';
import { createAuthenticationService } from '../application/use-cases/authentication';
import { createReportService } from '../application/use-cases/reports';
// Only the composition root selects concrete adapters and reads runtime settings.
export const workshop = createWorkshopService(new PostgresWorkshopRepository(), nodeSecurity);
export const authentication = createAuthenticationService(new PostgresIdentityRepository(), nodeSecurity, { allowDemoSignup: process.env.ALLOW_DEMO_SIGNUP === 'true', maxDemoWorkspaces: Number(process.env.MAX_DEMO_WORKSPACES || 100) });
export const reports = createReportService(workshop.readScenario);
