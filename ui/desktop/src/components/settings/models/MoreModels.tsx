import React from 'react';
import { Button } from '../../ui/button';
import { RecentModels } from './RecentModels';
import { ProviderButtons } from './ProviderButtons';
import BackButton from '../../ui/BackButton';
import { SearchBar } from './Search';
import { useModel } from './ModelContext';
import { AddModelInline } from './AddModelInline';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '../../ui/scroll-area';

export default function MoreModelsPage() {
  const { currentModel } = useModel();
  const navigate = useNavigate();

  return (
    <div className="h-screen w-full">
      <div className="relative flex items-center h-[36px] w-full bg-bgSubtle"></div>

      <ScrollArea className="h-full w-full">
        {/*
            Instead of forcing one row, allow the layout
            to stack vertically on small screens:
          */}

        <div className="px-8 pt-6 pb-4">
          <BackButton />
          <h1 className="text-3xl font-medium text-textStandard mt-1">More models</h1>
        </div>

        <div className="flex min-h-full flex-col md:flex-row">
          {/* Content Area */}
          {/* Smaller / responsive padding so we don't overflow on small screens */}
          <div className="flex-1 px-8 py-4">
            {/*
                Use a max-w but allow full width on very small screens
                so it doesn't overflow horizontally:
              */}
            <div className="max-w-full md:max-w-3xl mx-auto space-y-12">
              {/* Header Section */}
              <div>
                <div className="flex items-center justify-between mb-8">
                  <h1 className="text-2xl text-textStandard">More Models</h1>
                  <Button
                    variant="default"
                    className="h-9 px-4 text-sm whitespace-nowrap shrink-0
                                 bg-dark dark:bg-white text-Standard
                                 rounded-full border-none"
                    onClick={() => navigate('/settings/configure-providers')}
                  >
                    Configure Providers
                  </Button>
                </div>

                {currentModel && (
                  <p className="text-sm text-muted-foreground mb-8">
                    Current model: <span className="font-medium">{currentModel.name}</span> (
                    {currentModel.provider})
                  </p>
                )}
              </div>

              {/* Search Section */}
              <section>
                <h2 className="text-lg font-medium mb-4">Search Models</h2>
                <SearchBar />
              </section>

              {/* Add Model Section */}
              <section>
                <h2 className="text-lg font-medium mb-4">Add Model</h2>
                <AddModelInline />
              </section>

              {/* Provider Section */}
              <section>
                <h2 className="text-lg font-medium mb-4">Browse by Provider</h2>
                <div>
                  <ProviderButtons />
                </div>
              </section>

              {/* Recent Models Section */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-medium">Recently Used Models</h2>
                </div>
                <div>
                  <RecentModels />
                </div>
              </section>
            </div>
            {/* end .max-w-full */}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
