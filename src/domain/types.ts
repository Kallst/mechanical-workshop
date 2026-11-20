export const roles = ['Administrator', 'Workshop manager', 'Warehouse clerk', 'Technician'] as const;
export type Role = typeof roles[number];
export type OrderStatus = 'Draft' | 'Open' | 'In progress' | 'On hold' | 'Ready for review' | 'Closed' | 'Cancelled';
export type EquipmentStatus = 'Off' | 'Working' | 'Idle' | 'Powered unknown activity' | 'Unknown power';
export interface Actor { id: string; workspaceId: string; username: string; name: string; role: Role }
export interface Employee { id: string; name: string; role: Role; hourlyRateCents: number }
export interface Customer { id: string; name: string; contact: string }
export interface Vehicle { id: string; customerId: string; name: string; plate: string; kind: string }
export interface Cost { materials: number; labor: number; energy: number; total: number; unknownMinutes: number }
export interface ServiceOrder { id: string; vehicleId: string; description: string; status: OrderStatus; assigned: string[]; createdAt: number; closedAt?: number; snapshot?: Cost }
export interface Item { id: string; name: string; sku: string; unit: string; stock: number; unitCostCents: number; dailyDemand: number; demandHistory?: number[]; leadDays: number; safety: number; pack: number }
export interface MaterialRequest { id: string; orderId: string; employeeId: string; itemId: string; quantity: number; fulfilled: number; cancelled: boolean; at: number }
export interface Movement { id: string; kind: 'Receipt' | 'Issue' | 'Return' | 'Adjustment'; itemId: string; quantity: number; unitCostCents: number; amountCents: number; at: number; actor: string; orderId?: string; employeeId?: string; requestId?: string; sourceId?: string; reference: string }
export interface Segment { start: number; end: number | null }
export interface Intervention { id: string; orderId: string; employeeId: string; status: 'Running' | 'Paused' | 'Completed'; segments: Segment[]; hourlyRateCents: number; outcome: string }
export interface EquipmentSegment extends Segment { id: string; status: EquipmentStatus; orderId: string | null; workWatts: number; idleWatts: number; tariffCents: number }
export interface Equipment { id: string; name: string; workWatts: number; idleWatts: number; tariffCents: number; segments: EquipmentSegment[] }
export interface EquipmentEvent { id: string; equipmentId: string; at: number; status: EquipmentStatus; result: 'Accepted' | 'Quarantined' }
export interface IdleAlert { id: string; equipmentId: string; episode: string; at: number; status: 'Open' | 'Acknowledged' | 'Resolved'; acknowledgedBy?: string; resolvedAt?: number; unverified: boolean }
export interface Purchase { id: string; itemId: string; quantity: number; received: number; unitCostCents: number; supplier: string; status: 'Approved' | 'Ordered' | 'Partially received' | 'Received' | 'Cancelled'; at: number }
export interface Invoice { id: string; orderId: string; at: number; cost: Cost; customer: string; vehicle: string; description: string; issuedBy: string }
export interface WorkshopState {
  version: 1;
  clock: { minute: number; running: boolean; speed: number; wallAt: number; remainderMs: number };
  sequence: number;
  employees: Employee[]; customers: Customer[]; vehicles: Vehicle[]; orders: ServiceOrder[];
  items: Item[]; requests: MaterialRequest[]; movements: Movement[]; interventions: Intervention[];
  equipment: Equipment[]; events: EquipmentEvent[]; alerts: IdleAlert[]; purchases: Purchase[]; invoices: Invoice[];
}
export interface Command { action: string; payload: Record<string, unknown> }
export interface AuditEvent { action: string; details: Record<string, unknown> }
