import React from 'react';
import { Check, Plus } from 'lucide-react';
import { Button } from '../../ui/button';
import { supported_providers, required_keys, provider_aliases } from '../models/hardcoded_stuff';
import { useActiveKeys } from '../api_keys/ActiveKeysContext';
import { getProviderDescription } from './Provider';
import { ProviderSetupModal } from '../ProviderSetupModal';
import { useModel } from '../models/ModelContext';
import { useRecentModels } from '../models/RecentModels';
import { createSelectedModel } from '../models/utils';
import { getDefaultModel } from '../models/hardcoded_stuff';
import { initializeSystem } from '../../../utils/providerUtils';
import { getApiUrl, getSecretKey } from '../../../config';
import { toast } from 'react-toastify';
import { getActiveProviders } from '../api_keys/utils';
import { Tooltip } from '../../ui/Tooltip';

interface ProviderCardProps {
  name: string;
  description: string;
  isConfigured: boolean;
  onConfigure: () => void;
  onAddKeys: () => void;
}

function ProviderCard({
  name,
  description,
  isConfigured,
  onConfigure,
  onAddKeys,
}: ProviderCardProps) {
  return (
    <div className="relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow h-[160px] overflow-hidden">
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
          {name}
        </h3>
        {isConfigured && (
          <Tooltip content={`You have a ${name} API Key set in your environment`}>
            <div className="flex items-center gap-1 text-green-600 dark:text-green-500">
              <Check className="h-3.5 w-3.5" />
              <span className="text-xs">Ready</span>
            </div>
          </Tooltip>
        )}
      </div>

      <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-2 mb-4 line-clamp-2 leading-relaxed">
        {description}
      </p>

      <div className="absolute bottom-3 right-3">
        {isConfigured ? (
          <Button
            variant="default"
            size="sm"
            onClick={onConfigure}
            className="rounded-full h-7 px-3 min-w-[110px] bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white dark:text-white text-xs font-medium shadow-md hover:shadow-lg transition-all"
          >
            Select Provider
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={onAddKeys}
            className="rounded-full h-7 px-3 min-w-[90px] bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Keys
          </Button>
        )}
      </div>
    </div>
  );
}

export function ProviderGrid() {
  const { activeKeys, setActiveKeys } = useActiveKeys();
  const [selectedProvider, setSelectedProvider] = React.useState<any>(null);
  const [showSetupModal, setShowSetupModal] = React.useState(false);
  const { switchModel } = useModel();
  const { addRecentModel } = useRecentModels();

  const providers = React.useMemo(() => {
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

  const handleConfigure = async (provider) => {
    const providerId = provider.id.toLowerCase();
    await initializeSystem(providerId, null);

    // get the default model
    const modelName = getDefaultModel(providerId);

    // create model object
    const model = createSelectedModel(providerId, modelName);

    // Switch to the selected model
    switchModel(model);

    // Keep track of recently used models
    addRecentModel(model);

    // Save provider selection
    localStorage.setItem('GOOSE_PROVIDER', providerId);

    toast.success(`Switched to ${provider.name} provider`);
  };

  const handleAddKeys = (provider) => {
    setSelectedProvider(provider);
    setShowSetupModal(true);
  };

  const handleModalSubmit = async (apiKey: string) => {
    if (!selectedProvider) return;

    const provider = selectedProvider.name;
    const keyName = required_keys[provider]?.[0];

    if (!keyName) {
      console.error(`No key found for provider ${provider}`);
      return;
    }

    try {
      if (selectedProvider.isConfigured) {
        // Delete existing key logic if configured
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

        console.log('Old key deleted successfully.');
      }

      // Store new key logic
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

      console.log('Key stored successfully.');

      // Show success toast
      toast.success(
        selectedProvider.isConfigured
          ? `Successfully updated API key for ${provider}`
          : `Successfully added API key for ${provider}`
      );

      // Update active keys
      const updatedKeys = await getActiveProviders();
      setActiveKeys(updatedKeys);

      setShowSetupModal(false);
      setSelectedProvider(null);
    } catch (error) {
      console.error('Error handling modal submit:', error);
      toast.error(
        `Failed to ${selectedProvider.isConfigured ? 'update' : 'add'} API key for ${provider}`
      );
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Configure your AI model providers by adding their API keys. Your keys are stored securely
        and encrypted locally.
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 auto-rows-fr">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.id}
            name={provider.name}
            description={provider.description}
            isConfigured={provider.isConfigured}
            onConfigure={() => handleConfigure(provider)}
            onAddKeys={() => handleAddKeys(provider)}
          />
        ))}
      </div>

      {showSetupModal && selectedProvider && (
        <ProviderSetupModal
          provider={selectedProvider.name}
          model="Example Model"
          endpoint="Example Endpoint"
          onSubmit={handleModalSubmit}
          onCancel={() => {
            setShowSetupModal(false);
            setSelectedProvider(null);
          }}
        />
      )}
    </div>
  );
}
