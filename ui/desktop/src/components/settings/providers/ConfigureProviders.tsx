import React from 'react';
import { Providers } from './Provider';
import { ScrollArea } from '../../ui/scroll-area';
import BackButton from '../../ui/BackButton';
import { ConfigureProvidersGrid } from './ConfigureProvidersGrid';

export default function ConfigureProviders() {
  return (
    <div className="h-screen w-full">
      <div className="relative flex items-center h-[36px] w-full bg-bgSubtle"></div>

      <ScrollArea className="h-full w-full">
        <div className="px-8 pt-6 pb-4">
          <BackButton />
          <h1 className="text-3xl font-medium text-textStandard mt-1">Configure providers</h1>
        </div>

        {/* Content Area */}
        <div className="flex-1 px-8 py-8 pt-[20px]">
          <div className="max-w-5xl space-y-12">
            <div className="relative z-10">
              <ConfigureProvidersGrid />
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
