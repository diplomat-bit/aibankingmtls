import { MultiCloudIamGateway } from './iamMockServices';
import { ResourceNode, IamPolicyBinding } from '../types/iamTypes';

export class MockMultiCloudIamGateway implements MultiCloudIamGateway {
  async fetchIamPolicy(cloudProvider: 'AWS' | 'Azure' | 'GCP', resourceId: string): Promise<IamPolicyBinding[]> {
    console.log(`Fetching IAM policy for ${cloudProvider} resource: ${resourceId}`);
    return [
      {
        role: 'roles/viewer',
        members: ['user:example@example.com'],
        condition: undefined
      }
    ];
  }

  async testPermissions(cloudProvider: 'AWS' | 'Azure' | 'GCP', resourceId: string, permissions: string[], principal?: any): Promise<{ permission: string; granted: boolean }[]> {
    console.log(`Testing permissions for ${cloudProvider} resource: ${resourceId}`);
    return permissions.map(permission => ({
      permission,
      granted: true
    }));
  }

  async discoverResources(cloudProvider: 'AWS' | 'Azure' | 'GCP', query: string): Promise<ResourceNode[]> {
    console.log(`Discovering resources for ${cloudProvider} with query: ${query}`);
    return [
      {
        id: 'res-1',
        name: 'example-bucket',
        type: 'bucket',
        status: 'neutral',
        cloudProvider,
        children: []
      }
    ];
  }
}
