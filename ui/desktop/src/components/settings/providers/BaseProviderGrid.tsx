import React from 'react';
import { Check, Plus, Settings } from 'lucide-react';
import { Button } from '../../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../ui/Tooltip';
import { Portal } from '@radix-ui/react-portal';

// Common interfaces and helper functions
interface Provider {
  id: string;
  name: string;
  isConfigured: boolean;
  description: string;
}

interface BaseProviderCardProps {
  name: string;
  description: string;
  isConfigured: boolean;
  isSelected?: boolean;
  isSelectable?: boolean;
  onSelect?: () => void;
  onAddKeys?: () => void;
  onConfigure?: () => void;
  showSettings?: boolean;
}

function getArticle(word: string): string {
  return 'aeiouAEIOU'.indexOf(word[0]) >= 0 ? 'an' : 'a';
}

function BaseProviderCard({
  name,
  description,
  isConfigured,
  isSelected,
  isSelectable,
  onSelect,
  onAddKeys,
  onConfigure,
  showSettings,
}: BaseProviderCardProps) {
  return (
    <div
      onClick={() => isSelectable && isConfigured && onSelect?.()}
      className={`relative bg-white dark:bg-gray-800 rounded-lg border group
        ${
          isSelected
            ? 'border-blue-500 dark:border-blue-400 shadow-[0_0_0_1px] shadow-blue-500/50'
            : 'border-gray-200 dark:border-gray-700'
        } 
        p-3 transition-all duration-200 h-[140px]
        ${isSelectable && isConfigured ? 'cursor-pointer' : ''}
        ${!isSelectable ? 'hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md hover:scale-[1.01] hover:z-10' : ''}
        ${isSelectable && isConfigured ? 'hover:border-blue-400 dark:hover:border-blue-300 hover:shadow-md hover:z-10' : ''}
      `}
    >
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate mr-2">
            {name}
          </h3>
          {isConfigured && (
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 shrink-0">
                      <Check className="h-3 w-3 text-green-600 dark:text-green-500" />
                    </div>
                  </TooltipTrigger>
                  <Portal>
                    <TooltipContent side="top" align="center" className="z-[9999]">
                      <p>
                        You have {getArticle(name)} {name} API Key set in your environment
                      </p>
                    </TooltipContent>
                  </Portal>
                </Tooltip>
              </TooltipProvider>

              {showSettings && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onConfigure?.();
                        }}
                      >
                        <Settings className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300" />
                      </Button>
                    </TooltipTrigger>
                    <Portal>
                      <TooltipContent side="top" align="center" className="z-[9999]">
                        <p>Configure {name} settings</p>
                      </TooltipContent>
                    </Portal>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          )}
        </div>
      </div>

      <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1.5 mb-3 leading-normal overflow-y-auto max-h-[48px] pr-1">
        {description}
      </p>

      <div className="absolute bottom-2 right-3">
        {!isConfigured && onAddKeys && (
          <Button
            variant="default"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onAddKeys();
            }}
            className="rounded-full h-7 px-3 min-w-[90px] bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Key
          </Button>
        )}
      </div>
    </div>
  );
}

interface BaseProviderGridProps {
  providers: Provider[];
  isSelectable?: boolean;
  showSettings?: boolean;
  selectedId?: string | null;
  onSelect?: (providerId: string) => void;
  onAddKeys?: (provider: Provider) => void;
  onConfigure?: (provider: Provider) => void;
}

export function BaseProviderGrid({
  providers,
  isSelectable = false,
  showSettings = false,
  selectedId = null,
  onSelect,
  onAddKeys,
  onConfigure,
}: BaseProviderGridProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 auto-rows-fr max-w-full [&_*]:z-20">
      {providers.map((provider) => (
        <BaseProviderCard
          key={provider.id}
          name={provider.name}
          description={provider.description}
          isConfigured={provider.isConfigured}
          isSelected={selectedId === provider.id}
          isSelectable={isSelectable}
          onSelect={() => onSelect?.(provider.id)}
          onAddKeys={() => onAddKeys?.(provider)}
          onConfigure={() => onConfigure?.(provider)}
          showSettings={showSettings}
        />
      ))}
    </div>
  );
}
