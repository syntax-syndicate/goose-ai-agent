import React from 'react';
import { ProviderGrid } from './ProviderGrid';
import { ScrollArea } from '../ui/scroll-area';
import GooseSplashLogo from '../GooseSplashLogoGradient';
import { Button } from '../ui/button';

// Extending React CSSProperties to include custom webkit property
declare module 'react' {
  interface CSSProperties {
    WebkitAppRegion?: string;
  }
}

interface WelcomeScreenProps {
  onSubmit?: () => void;
}

export function WelcomeScreen({ onSubmit }: WelcomeScreenProps) {
  return (
    <div className="h-screen w-full select-none bg-white dark:bg-black">
      {/* Draggable title bar region */}
      <div className="h-[36px] w-full bg-transparent" style={{ WebkitAppRegion: 'drag' }} />

      {/* Content area - explicitly set as non-draggable */}
      <div
        className="h-[calc(100vh-36px)] w-full overflow-hidden"
        style={{ WebkitAppRegion: 'no-drag' }}
      >
        <ScrollArea className="h-full w-full">
          <div className="flex min-h-full flex-col items-center justify-center px-4 py-8 md:px-16">
            {/* Header Section */}
            <div className="mb-12 flex flex-col items-center space-y-4">
              <GooseSplashLogo className="h-24 w-24 md:h-32 md:w-32" />
              <h1 className="text-center text-4xl font-bold text-textStandard tracking-tight md:text-5xl">
                Welcome to Goose
              </h1>
              <p className="text-center text-lg text-textSubtle max-w-2xl">
                Your intelligent AI assistant for seamless productivity and creativity.
              </p>
            </div>

            {/* Get started */}
            <div className="mb-12 text-center">
              <h2 className="text-2xl font-semibold text-textStandard tracking-tight mb-4">
                Get Started
              </h2>
              <Button
                variant="outline"
                size="lg"
                className="text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                onClick={() =>
                  window.open('https://block.github.io/goose/v1/docs/quickstart', '_blank')
                }
              >
                Quick Start Guide
              </Button>
            </div>

            {/* ProviderGrid */}
            <div className="w-full max-w-4xl">
              <h2 className="text-2xl font-semibold text-textStandard tracking-tight mb-4 text-center">
                Choose a Provider
              </h2>
              <p className="text-sm text-textSubtle text-center mb-8">
                Configure your AI model providers by adding their API keys. Your keys are stored
                securely and encrypted locally. You can change your provider and select specific
                models in the settings.
              </p>
              <ProviderGrid onSubmit={onSubmit} />
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
