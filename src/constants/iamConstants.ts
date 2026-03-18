// /src/constants/iamConstants.ts
import { ResourceNode } from '../types/iamTypes';

export const COMMON_ROLES = {
  'Viewer': ['resourcemanager.projects.get', 'storage.objects.list', 'compute.instances.list'],
  'Editor': ['storage.objects.create', 'storage.objects.delete', 'compute.instances.start', 'compute.instances.stop', 'resourcemanager.projects.update'],
  'Storage Object Admin': ['storage.objects.create', 'storage.objects.delete', 'storage.objects.get', 'storage.objects.list', 'storage.objects.update'],
  'Cloud Functions Developer': ['cloudfunctions.functions.create', 'cloudfunctions.functions.delete', 'cloudfunctions.functions.get', 'cloudfunctions.functions.invoke'],
  'BigQuery Data Viewer': ['bigquery.datasets.get', 'bigquery.tables.get', 'bigquery.tables.getData'],
  'Security Admin': ['iam.roles.get', 'iam.roles.list', 'iam.serviceAccounts.getIamPolicy', 'resourcemanager.projects.getIamPolicy'],
};

export const getResourceType = (resourceId: string): ResourceNode['type'] => {
  if (resourceId.includes('/organizations/')) return 'organization';
  if (resourceId.includes('/folders/')) return 'folder';
  if (resourceId.includes('/projects/')) return 'project';
  if (resourceId.includes('/b/')) return 'bucket';
  if (resourceId.includes('/instances/')) return 'instance';
  if (resourceId.includes('/functions/')) return 'function';
  if (resourceId.includes('/databases/')) return 'database';
  if (resourceId.includes('/networks/')) return 'network';
  if (resourceId.includes('/serviceAccounts/')) return 'serviceAccount';
  return 'unknown';
};
