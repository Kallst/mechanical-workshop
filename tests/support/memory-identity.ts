import { randomUUID } from 'node:crypto';
import type { Actor, WorkshopState } from '../../src/domain/types';
import type { IdentityRepository, IdentityUnitOfWork, LoginAccount, NewUser } from '../../src/application/ports/identity-repository';
import type { AuditEntry } from '../../src/application/ports/workshop-repository';
import type { SecurityPort } from '../../src/application/ports/security';
export function memorySecurity(){let sequence=0;return {uuid:randomUUID,token:()=>String(++sequence).padStart(43,'t'),workspaceCode:()=>`demo-memory-${++sequence}`,digest:value=>'digest:'+value,hashPassword:async password=>'fixture:'+password,verifyPassword:async(password,encoded)=>encoded==='fixture:'+password,now:()=>1700000000000} satisfies SecurityPort;}
export class MemoryIdentityRepository implements IdentityRepository {
  data={workspaces:[] as {id:string;code:string;name:string}[],users:[] as (NewUser&{failedAttempts:number;lockedUntil:number|null})[],scenarios:[] as {id:string;workspaceId:string;state:WorkshopState}[],audit:[] as AuditEntry[],attempts:{} as Record<string,number>,sessions:{} as Record<string,string>};
  verificationCalls=0;
  async transaction<T>(operation:(unit:IdentityUnitOfWork)=>Promise<T>):Promise<T>{const before=structuredClone(this.data);const unit:IdentityUnitOfWork={
    lockAccount:async()=>{},removeExpiredAttempts:async()=>{},recentAttempts:async key=>this.data.attempts[key]||0,recordAttempt:async key=>{this.data.attempts[key]=(this.data.attempts[key]||0)+1;},
    findAccount:async(code,username)=>{const workspace=this.data.workspaces.find(w=>w.code===code);const user=this.data.users.find(u=>u.workspaceId===workspace?.id&&u.username===username);return user?{id:user.id,passwordHash:user.passwordHash,failedAttempts:user.failedAttempts,lockedUntil:user.lockedUntil} satisfies LoginAccount:undefined;},
    recordFailedLogin:async(id,failures,lockSeconds)=>{const user=this.data.users.find(u=>u.id===id)!;user.failedAttempts=failures;user.lockedUntil=lockSeconds===null?null:1700000000000+lockSeconds*1000;},clearFailedLogins:async id=>{const user=this.data.users.find(u=>u.id===id)!;user.failedAttempts=0;user.lockedUntil=null;},lockProvisioning:async()=>{},workspaceCount:async()=>this.data.workspaces.length,workspaceExists:async code=>this.data.workspaces.some(w=>w.code===code),createWorkspace:async(id,code,name)=>{this.data.workspaces.push({id,code,name});},createUser:async user=>{this.data.users.push({...user,failedAttempts:0,lockedUntil:null});},createScenario:async(id,workspaceId,name,state)=>{this.data.scenarios.push({id,workspaceId,state});},appendAudit:async entry=>{this.data.audit.push(entry);}
  };try{return await operation(unit);}catch(error){this.data=before;throw error;}}
  async createSession(userId:string,hash:string){this.data.sessions[hash]=userId;}
  async actorForSession(hash:string):Promise<Actor|undefined>{const user=this.data.users.find(u=>u.id===this.data.sessions[hash]);return user?{id:user.id,workspaceId:user.workspaceId,username:user.username,name:user.name,role:user.role}:undefined;}
  async revokeSession(hash:string){delete this.data.sessions[hash];}
}
