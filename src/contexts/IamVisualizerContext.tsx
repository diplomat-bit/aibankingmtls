// /src/contexts/IamVisualizerContext.tsx
import React, { createContext, useContext, useMemo } from 'react';

export interface IamVisualizerConfig {
  geminiApiKey: string;
  chatGptApiKey: string;
  enableAdvancedAiFeatures: boolean;
  multiCloudIntegrationEnabled: boolean;
  auditLogRetentionDays: number;
  externalServicesEndpoints: Record<string, string>;
}

const defaultConfig: IamVisualizerConfig = {
  geminiApiKey: 'YOUR_GEMINI_API_KEY',
  chatGptApiKey: 'YOUR_CHATGPT_API_KEY',
  enableAdvancedAiFeatures: true,
  multiCloudIntegrationEnabled: true,
  auditLogRetentionDays: 90,
  externalServicesEndpoints: {
    'GcpAuditLogService': '/api/gcp/auditlogs',
    'GcpSecurityCommandCenterAPI': '/api/gcp/scc',
    'GcpPolicyIntelligenceAPI': '/api/gcp/policyintelligence',
    'AwsIamApi': '/api/aws/iam',
    'AzureRbacApi': '/api/azure/rbac',
    'SplunkLogService': '/api/splunk/logs',
    'JiraIntegration': '/api/jira',
    'SlackNotificationService': '/api/slack',
    'ThreatIntelligenceFeed': '/api/threatintel',
    'ComplianceNIST': '/api/compliance/nist',
    'ComplianceISO27001': '/api/compliance/iso27001',
    'OktaIdentityService': '/api/okta',
    'TerraformStateManager': '/api/terraform/state',
    'GitVersionControl': '/api/git',
    'CisBenchmarks': '/api/compliance/cis',
    'SmsNotificationService': '/api/sms',
    'EmailNotificationService': '/api/email',
  },
};

const IamVisualizerConfigContext = createContext<IamVisualizerConfig>(defaultConfig);

export const useIamVisualizerConfig = () => useContext(IamVisualizerConfigContext);

export const IamVisualizerConfigProvider: React.FC<{ children: React.ReactNode; config?: Partial<IamVisualizerConfig> }> = ({ children, config }) => {
  const mergedConfig = useMemo(() => ({ ...defaultConfig, ...config }), [config]);
  return (
    <IamVisualizerConfigContext.Provider value={mergedConfig}>
      {children}
    </IamVisualizerConfigContext.Provider>
  );
};
