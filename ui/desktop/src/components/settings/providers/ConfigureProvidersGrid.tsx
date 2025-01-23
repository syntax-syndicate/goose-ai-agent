import React, { useMemo, useState } from 'react';
import { useActiveKeys } from '../api_keys/ActiveKeysContext';
import { BaseProviderGrid } from './BaseProviderGrid';
import { supported_providers, provider_aliases } from '../models/hardcoded_stuff';
import { getProviderDescription } from './Provider';

// Settings version - non-selectable cards with settings gear
export function ConfigureProvidersGrid() {
  const { activeKeys, setActiveKeys } = useActiveKeys();
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [selectedForSetup, setSelectedForSetup] = useState<string | null>(null);

  const providers = useMemo(() => {
    return supported_providers.map((providerName) => {
      const alias =
        provider_aliases.find((p) => p.provider === providerName)?.alias ||
        providerName.toLowerCase();
      const isConfigured = activeKeys.includes(providerName);

      return {
        id: alias,
        name: providerName,
        isConfigured,
        description: getProviderDescription(providerName),
      };
    });
  }, [activeKeys]);

  const handleAddKeys = (provider) => {
    setSelectedForSetup(provider.id);
    setShowSetupModal(true);
  };

  const handleConfigure = (provider) => {
    // Handle opening provider-specific settings
    // This could navigate to a settings page or open a modal
  };

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      <BaseProviderGrid
        providers={providers}
        showSettings={true}
        onAddKeys={handleAddKeys}
        onConfigure={handleConfigure}
      />

      {/* ... modal ... */}
    </div>
  );
}
