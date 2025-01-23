import React, { useMemo, useState } from 'react';
import { useActiveKeys } from '../api_keys/ActiveKeysContext';
import { BaseProviderGrid } from './BaseProviderGrid';
import { supported_providers, provider_aliases, required_keys } from '../models/hardcoded_stuff';
import { getProviderDescription } from './Provider';
import { ProviderSetupModal } from '../ProviderSetupModal';
import { getApiUrl, getSecretKey } from '../../../config';
import { toast } from 'react-toastify';
import { getActiveProviders } from '../api_keys/utils';

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

  const handleModalSubmit = async (apiKey: string) => {
    if (!selectedForSetup) return;

    const provider = providers.find((p) => p.id === selectedForSetup)?.name;
    const keyName = required_keys[provider]?.[0];

    if (!keyName) {
      console.error(`No key found for provider ${provider}`);
      return;
    }

    try {
      if (selectedForSetup && providers.find((p) => p.id === selectedForSetup)?.isConfigured) {
        const deleteResponse = await fetch(getApiUrl('/secrets/delete'), {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-Secret-Key': getSecretKey(),
          },
          body: JSON.stringify({ key: keyName }),
        });

        if (!deleteResponse.ok) {
          const errorText = await deleteResponse.text();
          console.error('Delete response error:', errorText);
          throw new Error('Failed to delete old key');
        }
      }

      const storeResponse = await fetch(getApiUrl('/secrets/store'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Secret-Key': getSecretKey(),
        },
        body: JSON.stringify({
          key: keyName,
          value: apiKey.trim(),
        }),
      });

      if (!storeResponse.ok) {
        const errorText = await storeResponse.text();
        console.error('Store response error:', errorText);
        throw new Error('Failed to store new key');
      }

      const isUpdate =
        selectedForSetup && providers.find((p) => p.id === selectedForSetup)?.isConfigured;
      toast.success(
        isUpdate
          ? `Successfully updated API key for ${provider}`
          : `Successfully added API key for ${provider}`
      );

      const updatedKeys = await getActiveProviders();
      setActiveKeys(updatedKeys);

      setShowSetupModal(false);
      setSelectedForSetup(null);
    } catch (error) {
      console.error('Error handling modal submit:', error);
      toast.error(
        `Failed to ${selectedForSetup && providers.find((p) => p.id === selectedForSetup)?.isConfigured ? 'update' : 'add'} API key for ${provider}`
      );
    }
  };

  const handleConfigure = (provider) => {
    // Handle opening provider-specific settings
    // This could navigate to a settings page or open a modal
  };

  const handleDelete = async (provider) => {
    const keyName = required_keys[provider.name]?.[0];
    if (!keyName) {
      console.error(`No key found for provider ${provider.name}`);
      return;
    }

    try {
      const deleteResponse = await fetch(getApiUrl('/secrets/delete'), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Secret-Key': getSecretKey(),
        },
        body: JSON.stringify({ key: keyName }),
      });

      if (!deleteResponse.ok) {
        throw new Error('Failed to delete key');
      }

      const updatedKeys = await getActiveProviders();
      setActiveKeys(updatedKeys);
      toast.success(`Removed API key for ${provider.name}`);
    } catch (error) {
      console.error('Error deleting key:', error);
      toast.error(`Failed to remove API key for ${provider.name}`);
    }
  };

  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      <BaseProviderGrid
        providers={providers}
        showSettings={true}
        onAddKeys={handleAddKeys}
        onConfigure={handleConfigure}
        onDelete={handleDelete}
      />

      {showSetupModal && selectedForSetup && (
        <div className="relative z-[9999]">
          <ProviderSetupModal
            provider={providers.find((p) => p.id === selectedForSetup)?.name}
            model="Example Model"
            endpoint="Example Endpoint"
            onSubmit={handleModalSubmit}
            onCancel={() => {
              setShowSetupModal(false);
              setSelectedForSetup(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
