// /src/services/iamMockServices.ts
import { IamPolicyBinding, PolicyCondition, ResourceNode, RemediationProposal, AuditLogEntry, ComplianceStandard, PolicyTemplate } from '../types/iamTypes';
import { IamVisualizerConfig } from '../contexts/IamVisualizerContext';

export interface GeminiAIService {
  interpretNaturalLanguagePolicy(query: string): Promise<{ permissions: string[]; conditions: PolicyCondition[] }>;
  generateRemediationProposal(auditLogs: AuditLogEntry[], currentPolicies: IamPolicyBinding[], desiredState: string): Promise<RemediationProposal>;
  analyzeSecurityPosture(resourceId: string, policies: IamPolicyBinding[], config: IamVisualizerConfig): Promise<{ score: number; recommendations: string[] }>;
}

export interface ChatGPTService {
  explainPolicyEffect(principal: string, permission: string, resource: string, evaluationResult: boolean, policies: IamPolicyBinding[]): Promise<string>;
  suggestPermissionsForRole(roleName: string, context: string): Promise<string[]>;
  summarizeAuditLogs(logs: AuditLogEntry[]): Promise<string>;
}

export interface GcpAuditLogService {
  fetchLogsForResource(resourceId: string, timeRange?: { start: string; end: string }): Promise<AuditLogEntry[]>;
  streamRealtimeLogs(resourceId: string): AsyncGenerator<AuditLogEntry>;
}

export interface GcpPolicyIntelligenceAPI {
  analyzePolicyOveruse(resourceId: string): Promise<{ roles: string[]; insights: string[] }>;
  simulateWhatIfPolicy(resourceId: string, proposedBinding: IamPolicyBinding): Promise<{ granted: boolean; reasons: string[] }>;
  recommendLeastPrivilege(principalId: string, accessHistory: AuditLogEntry[]): Promise<IamPolicyBinding[]>;
}

export interface MultiCloudIamGateway {
  fetchIamPolicy(cloudProvider: 'AWS' | 'Azure' | 'GCP', resourceId: string): Promise<IamPolicyBinding[]>;
  testPermissions(cloudProvider: 'AWS' | 'Azure' | 'GCP', resourceId: string, permissions: string[], principal?: any): Promise<{ permission: string; granted: boolean }[]>;
  discoverResources(cloudProvider: 'AWS' | 'Azure' | 'GCP', query: string): Promise<ResourceNode[]>;
}

export interface ComplianceFrameworkService {
  getStandards(): Promise<ComplianceStandard[]>;
  evaluateResourceCompliance(standardId: string, resource: ResourceNode, policies: IamPolicyBinding[]): Promise<{ rule: any; compliant: boolean; details?: string }[]>;
}

export interface SIEMIntegrationService {
  sendSecurityAlert(alert: { severity: string; message: string; details: any }): Promise<void>;
  querySecurityEvents(query: string): Promise<any[]>;
}

export interface WorkflowTicketingService {
  createTicket(title: string, description: string, assignee: string, severity: 'low' | 'medium' | 'high'): Promise<{ ticketId: string; url: string }>;
  updateTicketStatus(ticketId: string, status: string): Promise<void>;
}

export interface PolicyVersionControlService {
  commitPolicy(policy: IamPolicyBinding[], message: string, author: string): Promise<string>;
  getPolicyHistory(resourceId: string): Promise<{ commitId: string; timestamp: string; author: string; message: string }[]>;
  rollbackPolicy(resourceId: string, commitId: string): Promise<IamPolicyBinding[]>;
}

export interface PolicyTemplateService {
  getTemplates(filter?: { cloudProvider?: string; tags?: string[] }): Promise<PolicyTemplate[]>;
  applyTemplate(templateId: string, resourceId: string, principalId?: string): Promise<IamPolicyBinding[]>;
}

export interface ThreatIntelligenceService {
  checkPermissionForRisks(permission: string): Promise<{ riskScore: number; details: string; commonExploits: string[] }>;
  checkPrincipalForThreats(principalId: string): Promise<{ knownThreats: boolean; indicatorsOfCompromise: string[] }>;
}
