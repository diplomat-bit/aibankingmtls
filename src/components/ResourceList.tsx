import React, { useEffect, useState } from 'react';
import { useIamServices } from '../contexts/IamServicesContext';
import { ResourceNode } from '../types/iamTypes';

export const ResourceList: React.FC = () => {
  const { multiCloudIamGateway } = useIamServices();
  const [resources, setResources] = useState<ResourceNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResources = async () => {
      setLoading(true);
      try {
        const data = await multiCloudIamGateway.discoverResources('GCP', '*');
        setResources(data);
      } catch (error) {
        console.error('Failed to fetch resources', error);
      } finally {
        setLoading(false);
      }
    };
    fetchResources();
  }, [multiCloudIamGateway]);

  if (loading) return <div>Loading resources...</div>;

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Resources</h2>
      <ul>
        {resources.map(resource => (
          <li key={resource.id} className="mb-2 p-2 border rounded">
            {resource.name} ({resource.type})
          </li>
        ))}
      </ul>
    </div>
  );
};
