import React from 'react';
import { ProviderGrid } from './ProviderGrid';
import { ScrollArea } from '../ui/scroll-area';
import { Goose } from '../icons/Goose';

// Extending React CSSProperties to include custom webkit property
declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: string; // Now TypeScript knows about WebkitAppRegion
  }
}

interface WelcomeScreenProps {
  onSubmit?: () => void;
}

export function WelcomeScreen({ onSubmit }: WelcomeScreenProps) {
  return (
    <div className="h-screen w-full select-none bg-bgSubtle">
      {/* Draggable title bar region */}
      <div className="h-[36px] w-full bg-surface/50" style={{ WebkitAppRegion: 'drag' }} />

      {/* Content area - explicitly set as non-draggable */}
      <div
        className="h-[calc(100vh-36px)] w-full bg-surface dark:bg-surface-dark overflow-hidden p-4"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <ScrollArea className="h-full w-full">
          <div className="flex min-h-full">
            {/* Content Area */}
            <div className="flex-1 px-16 py-8 pt-[20px]">
              <div className="max-w-3xl space-y-12">
                {/* Header Section */}
                <div className="flex items-center gap-4 mb-8">
                  <h1 className="text-2xl font-semibold text-textStandard tracking-tight">
                    Welcome to goose
                  </h1>
                  <h1 className="text-2xl font-semibold text-textStandard tracking-tight">
                    <Goose />
                  </h1>
                </div>
                {/* Get started */}
                <div>
                  <h2 className="text-xl font-semibold text-textStandard tracking-tight">
                    Get started
                  </h2>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Check out the{' '}
                    <a
                      href="https://block.github.io/goose/v1/docs/quickstart"
                      target="_blank" // Optional: Opens the link in a new tab
                      rel="noopener noreferrer" // Optional: Security for external links
                      className="text-indigo-500 hover:text-indigo-600 text-sm"
                    >
                      quick start guide
                    </a>
                    .
                  </div>
                </div>
                {/* ProviderGrid */}
                <div>
                  <h2 className="text-xl font-semibold text-textStandard tracking-tight">
                    Choose a provider
                  </h2>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Configure your AI model providers by adding their API keys. Your keys are stored
                    securely and encrypted locally. You can change your provider and select specific
                    models in the settings.
                  </div>
                </div>
                <ProviderGrid onSubmit={onSubmit} />
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
