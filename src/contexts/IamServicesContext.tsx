import React, { createContext, useContext, useMemo } from 'react';
import { MultiCloudIamGateway } from '../services/iamMockServices';
import { MockMultiCloudIamGateway } from '../services/mockIamServices';

export interface IamServices {
  multiCloudIamGateway: MultiCloudIamGateway;
}

const IamServicesContext = createContext<IamServices | null>(null);

export const useIamServices = () => {
  const context = useContext(IamServicesContext);
  if (!context) {
    throw new Error('useIamServices must be used within an IamServicesProvider');
  }
  return context;
};

export const IamServicesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const services = useMemo(() => ({
    multiCloudIamGateway: new MockMultiCloudIamGateway(),
  }), []);

  return (
    <IamServicesContext.Provider value={services}>
      {children}
    </IamServicesContext.Provider>
  );
};
