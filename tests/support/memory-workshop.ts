import { createBaseline } from '../../src/domain/seed';
import type { WorkshopRepository, WorkshopUnitOfWork, AuditEntry, CommandReceipt } from '../../src/application/ports/workshop-repository';
export class MemoryWorkshopRepository implements WorkshopRepository {
  workspaceId='00000000-0000-4000-8000-000000000001';
  scenarioId='00000000-0000-4000-8000-000000000002';
  data={state:createBaseline(),revision:0,audit:[] as AuditEntry[],receipts:{} as Record<string,CommandReceipt>};
  failAudit=false;
  async context(workspaceId:string){if(workspaceId!==this.workspaceId)throw Error('Wrong workspace');return {workspace:{code:'memory-workshop',name:'Port test workshop'},scenarios:[{id:this.scenarioId,name:'Test scenario',revision:this.data.revision}]};}
  async audit(workspaceId:string,scenarioId:string){if(workspaceId!==this.workspaceId||scenarioId!==this.scenarioId)return [];return this.data.audit.map(row=>({actor_name:row.actorName,action:row.action,details:row.details,scenario_minute:row.minute,recorded_at:'2026-11-23T09:00:00Z'}));}
  async transaction<T>(operation:(unit:WorkshopUnitOfWork)=>Promise<T>):Promise<T>{
    const draft=structuredClone(this.data);
    const unit:WorkshopUnitOfWork={
      findScenario:async(workspaceId,id)=>workspaceId===this.workspaceId&&(!id||id===this.scenarioId)?{id:this.scenarioId,name:'Test scenario',revision:draft.revision,state:draft.state}:undefined,
      findReceipt:async(id,key)=>draft.receipts[id+key],
      saveScenario:async(id,state,revision)=>{if(id!==this.scenarioId)throw Error('Wrong scenario');draft.state=state;draft.revision=revision;},
      appendAudit:async entry=>{if(this.failAudit)throw Error('Injected audit failure');draft.audit.push(entry);},
      saveReceipt:async(id,key,actorId,payloadHash,result)=>{draft.receipts[id+key]={actorId,payloadHash,result};},
    };
    const result=await operation(unit);this.data=draft;return result;
  }
}
