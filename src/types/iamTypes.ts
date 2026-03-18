// /src/types/iamTypes.ts

export type SimulationStatus = 'idle' | 'running' | 'completed' | 'error' | 'analyzing' | 'remediating';
export type NodeStatus = 'neutral' | 'pending' | 'success' | 'fail' | 'partial' | 'inferred';

export interface ResourceNode {
  id: string;
  name: string;
  type: 'project' | 'bucket' | 'instance' | 'function' | 'database' | 'network' | 'serviceAccount' | 'unknown' | 'organization' | 'folder';
  status: NodeStatus;
  results?: { permission: string; granted: boolean; conditionEvaluated?: boolean; conditionSatisfied?: boolean }[];
  policyBindings?: IamPolicyBinding[];
  tags?: string[];
  metadata?: Record<string, any>;
  parentResourceId?: string;
  cloudProvider?: 'GCP' | 'AWS' | 'Azure' | 'Multi-Cloud';
  children?: ResourceNode[];
}

export interface IamPolicyBinding {
  role: string;
  members: string[];
  condition?: PolicyCondition;
  id?: string;
  source?: 'manual' | 'discovered' | 'recommended' | 'ai-generated';
  effectiveOn?: string;
  expiresOn?: string;
}

export interface PolicyCondition {
  expression: string;
  title?: string;
  description?: string;
  evaluatedResult?: boolean;
}

export interface SimulationPrincipal {
  id: string;
  type: 'user' | 'serviceAccount' | 'group' | 'externalIdentity';
  attributes?: Record<string, any>;
  effectiveRoles?: string[];
}

export interface SimulationConfig {
  principal: SimulationPrincipal;
  permissions: string[];
  resources: string[];
  context: SimulationContext;
  id?: string;
  name?: string;
  description?: string;
  createdAt?: string;
  lastModified?: string;
}

export interface SimulationContext {
  requestIp?: string;
  requestTime?: string;
  deviceName?: string;
  resourceLabels?: Record<string, string>;
}

export interface RemediationProposal {
  id: string;
  description: string;
  changes: PolicyChange[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  status: 'pending' | 'applied' | 'rejected';
  reasoning?: string;
  generatedBy?: 'Gemini' | 'ChatGPT' | 'AutoOptimizer';
}

export interface PolicyChange {
  action: 'add' | 'remove' | 'update';
  resourceId: string;
  binding: IamPolicyBinding;
  oldBinding?: IamPolicyBinding;
}

export interface AuditLogEntry {
  timestamp: string;
  principalId: string;
  resourceId: string;
  methodName: string;
  granted: boolean;
  reason: string;
  metadata: Record<string, any>;
}

export interface ComplianceStandard {
  id: string;
  name: string;
  description: string;
  rules: ComplianceRule[];
}

export interface ComplianceRule {
  id: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  checkFunction: (resource: ResourceNode, policy: IamPolicyBinding[]) => boolean;
  aiPromptId?: string;
  remediationGuidance?: string;
}

export interface PolicyTemplate {
  id: string;
  name: string;
  description: string;
  bindings: IamPolicyBinding[];
  tags: string[];
  cloudProvider: 'GCP' | 'AWS' | 'Azure' | 'Multi-Cloud';
}
