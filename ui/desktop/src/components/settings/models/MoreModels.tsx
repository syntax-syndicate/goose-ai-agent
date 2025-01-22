import React from 'react';
import { Button } from "../../ui/button"
import { RecentModels } from "./RecentModels"
import { ProviderButtons } from "./ProviderButtons"
import BackButton from "../../ui/BackButton";
import { SearchBar} from "./Search";
import { useModel} from "./ModelContext";
import { AddModelInline } from "./AddModelInline";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "../../ui/scroll-area";

export default function MoreModelsPage() {
    const { currentModel } = useModel();
    const navigate = useNavigate();

    return (
        <div className="h-screen w-full pt-[36px]">
            <div className="h-full w-full bg-white dark:bg-gray-800 overflow-hidden p-2 pt-0">
                <ScrollArea className="h-full w-full">
                    <div className="flex min-h-full">
                        {/* Left Navigation */}
                        <div className="w-48 border-r border-gray-100 dark:border-gray-700 px-2 pt-2">
                            <div className="sticky top-8">
                                <BackButton className="mb-4" />
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 px-16 py-8 pt-[20px]">
                            <div className="max-w-3xl space-y-12">
                                {/* Header Section */}
                                <div>
                                    <div className="flex items-center justify-between mb-8">
                                        <h1 className="text-2xl font-semibold tracking-tight">More Models</h1>
                                        <Button
                                            variant="outline"
                                            onClick={() => navigate("/settings/configure-providers")}
                                        >
                                            Configure Providers
                                        </Button>
                                    </div>

                                    {/* Current Model Info */}
                                    {currentModel && (
                                        <p className="text-sm text-muted-foreground mb-8">
                                            Current model: <span className="font-medium">{currentModel.name}</span> ({currentModel.provider})
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
                                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                                        <RecentModels />
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}