import React, { useState } from 'react';
import { Button } from "../../ui/button"
import { ModelList } from "./ModelList"
import { ProviderButtons } from "./ProviderButtons"
import { AddModelDialog } from "./AddModelDialog"
import BackButton from "../../ui/BackButton";
import { models } from "./hardcoded_stuff"
import { SearchBar} from "./Search";
import { useModel } from './ModelContext';


// TODO: handle darkmode
export default function MoreModelsPage() {
    const [currentModel, setCurrentModel] = useState(models.find(m => m.active))

    // TODO: use function that affects state globally
    const handleModelChange = (modelId: number) => {
        const newModel = models.find(m => m.id === modelId)
        if (newModel) {
            setCurrentModel(newModel)
        }
    }

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            {/* Left-hand side exit button */}
            <aside className="w-48 border-r border-gray-100 dark:border-gray-700 px-2 pt-6">
                <div className="sticky top-8">
                    <BackButton/>
                </div>
            </aside>

            <div className="container max-w-6xl mx-auto p-6">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-semibold">More Models</h1>
                        {currentModel && (
                            <p className="text-sm text-muted-foreground mt-2">
                                Current model: <span className="font-medium">{currentModel.name}</span> ({currentModel.provider})
                            </p>
                        )}
                    </div>
                    <AddModelDialog/>
                </div>

                {/* Main content area */}
                <div className="space-y-8">
                    {/* Search section */}
                    <SearchBar onModelChange={handleModelChange}/>

                    {/* Provider buttons */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-medium">Browse by Provider</h2>
                        <ProviderButtons/>
                    </div>

                    {/* Recent models */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-medium">Recently Used Models</h2>
                            <Button variant="ghost" className="text-blue-500 hover:text-blue-600">
                                View all
                            </Button>
                        </div>
                        <ModelList/>
                    </div>
                </div>
            </div>
        </div>
    );
}


