import React, { useEffect, useRef } from 'react';
import { loadModernTreasury } from '@modern-treasury/modern-treasury-js';
const PUBLISHABLE_KEY = "publishable-live-JrFTgAvyQhmZFvVDztRzeVUC7HJ"
const modernTreasury = await loadModernTreasury(PUBLISHABLE_KEY);

interface ModernTreasuryFlowProps {
  clientToken: string;
  publishableKey: string;
  onSuccess?: (result: any) => void;
  onError?: (error: any) => void;
  variables?: {
    colorPrimary?: string;
    colorBackground?: string;
    fontFamily?: string;
  };
}

export const ModernTreasuryFlow: React.FC<ModernTreasuryFlowProps> = ({
  clientToken,
  publishableKey,
  onSuccess,
  onError,
  variables
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    const initFlow = async () => {
      try {
        const modernTreasury = await loadModernTreasury(publishableKey);
        
        if (!modernTreasury) {
          throw new Error("Failed to load Modern Treasury SDK");
        }

        if (!mounted || !mountRef.current) return;

        const embeddableFlow = modernTreasury.createEmbeddableFlow({
          clientToken,
          onSuccess: (result: any) => {
            console.log("Modern Treasury Success:", result);
            onSuccess?.(result);
          },
          onError: (error: any) => {
            console.error("Modern Treasury Error:", error);
            onError?.(error);
          },
          variables: variables as any
        });

        // Clear previous content if any
        if (mountRef.current) {
          mountRef.current.innerHTML = '';
        }

        embeddableFlow.mount('#mt-mount-point');
      } catch (err) {
        console.error("Failed to load Modern Treasury:", err);
      }
    };

    initFlow();

    return () => {
      mounted = false;
    };
  }, [clientToken, publishableKey, onSuccess, onError, variables]);

  return (
    <div className="w-full min-h-[600px] bg-[#0D0D0D] rounded-3xl overflow-hidden border border-white/5">
      <div ref={mountRef} id="mt-mount-point" className="w-full h-full" />
    </div>
  );
};
