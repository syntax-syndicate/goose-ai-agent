import React, { useState, useEffect } from "react"
import { Clock } from 'lucide-react';
import { Model } from "./ModelContext"
import { useHandleModelSelection } from "./utils";
import { useModel } from "./ModelContext";

const MAX_RECENT_MODELS = 3

export function useRecentModels() {
    const [recentModels, setRecentModels] = useState<Model[]>([])

    useEffect(() => {
        const storedModels = localStorage.getItem("recentModels")
        if (storedModels) {
            setRecentModels(JSON.parse(storedModels))
        }
    }, [])

    const addRecentModel = (model: Model) => {
        const modelWithTimestamp = { ...model, lastUsed: new Date().toISOString() }; // Add lastUsed field
        setRecentModels((prevModels) => {
            const updatedModels = [modelWithTimestamp, ...prevModels.filter((m) => m.name !== model.name)].slice(0, MAX_RECENT_MODELS);

            localStorage.setItem("recentModels", JSON.stringify(updatedModels));
            return updatedModels;
        });
    };

    return { recentModels, addRecentModel }
}

export function RecentModels() {
    const { recentModels } = useRecentModels();
    const { currentModel } = useModel();
    const handleModelSelection = useHandleModelSelection();
    const [selectedModel, setSelectedModel] = useState<string | null>(null);

    useEffect(() => {
        if (currentModel) {
            setSelectedModel(currentModel.name);
        }
    }, [currentModel]);

    const handleRadioChange = async (model: Model) => {
        if (selectedModel === model.name) {
            console.log(`Model "${model.name}" is already active.`);
            return;
        }

        setSelectedModel(model.name);
        await handleModelSelection(model, "RecentModels");
    };

    return (
        <div className="space-y-2">
            {recentModels.map((model) => (
                <label
                    key={model.name}
                    className="block cursor-pointer"
                >
                    <div
                        className="flex items-center justify-between p-4 transition-colors
                            hover:text-gray-900 dark:hover:text-white"
                        onClick={() => handleRadioChange(model)}
                    >
                        <div className="flex items-center space-x-4">
                            <div className="relative">
                                <input
                                    type="radio"
                                    name="recentModels"
                                    value={model.name}
                                    checked={selectedModel === model.name}
                                    onChange={() => handleRadioChange(model)}
                                    className="peer sr-only"
                                />
                                <div className="h-4 w-4 rounded-full border border-gray-400 dark:border-gray-500
                                              peer-checked:border-[6px] peer-checked:border-black dark:peer-checked:border-white
                                              peer-checked:bg-white dark:peer-checked:bg-black
                                              transition-all duration-200 ease-in-out">
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="font-medium">{model.name}</p>
                                <p className="text-sm text-muted-foreground">{model.provider}</p>
                            </div>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground">
                            <Clock className="w-4 h-4 mr-2" />
                            {model.lastUsed ? new Date(model.lastUsed).toLocaleString() : "N/A"}
                        </div>
                    </div>
                </label>
            ))}
        </div>
    );
}

export function RecentModelsRadio() {
    const { recentModels } = useRecentModels(); // Access recent models
    const handleModelSelection = useHandleModelSelection(); // Access the model selection handler
    const { currentModel } = useModel(); // Get the current selected model
    const [selectedModel, setSelectedModel] = useState<string | null>(null); // Track the currently selected model

    // Initialize selectedModel with the currentModel on component mount
    useEffect(() => {
        if (currentModel) {
            setSelectedModel(currentModel.name);
        }
    }, [currentModel]);

    const handleRadioChange = async (model: Model) => {
        if (selectedModel === model.name) {
            // Display feedback for already selected model
            console.log(`Model "${model.name}" is already active.`);
            return;
        }

        setSelectedModel(model.name); // Update the selected model locally
        await handleModelSelection(model, "RecentModels"); // Switch the model using the handler
    };

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Recent Models</h2>
            {recentModels.map((model) => (
                <label
                    key={model.name}
                    className="flex items-center justify-between p-4 cursor-pointer"
                >
                    <div className="space-y-1">
                        <p className="font-medium">{model.name}</p>
                        <p className="text-sm text-muted-foreground">{model.provider}</p>
                    </div>
                    <div className="relative">
                        <input
                            type="radio"
                            name="recentModels"
                            value={model.name}
                            checked={selectedModel === model.name}
                            onChange={() => handleRadioChange(model)}
                            className="peer sr-only" // Hide the default radio button
                        />
                        <div className="h-4 w-4 rounded-full border border-gray-400 dark:border-gray-500
                                      peer-checked:border-[6px] peer-checked:border-black dark:peer-checked:border-white
                                      peer-checked:bg-white dark:peer-checked:bg-black
                                      transition-all duration-200 ease-in-out">
                        </div>
                    </div>
                </label>
            ))}
        </div>
    );
}