import { useModel } from "./ModelContext"; // Import the useModel hook
import { Model } from "./ModelContext";
import { useMemo } from "react";
import { goose_models } from "./hardcoded_stuff";
import {ToastFailureGeneral, ToastSuccessModelSwitch} from "./toasts";
import {initializeSystem} from "../../../utils/providerUtils";

export function useHandleModelSelection() {
    const { switchModel, currentModel} = useModel(); // Access switchModel via useModel

    return async (model: Model, componentName?: string) => {
        try {
            // Check if the selected model is already the active model
            if (currentModel?.id === model.id) {
                console.log(`[${componentName}] Selected model is already active: ${model.name}`);
                return;
            }

            // Call the context's switchModel to update the model
            switchModel(model);

            // switch models via the backend
            // set env var

            // initialize agent
            await initializeSystem(model.provider, model.name)

            // Log to the console for tracking
            console.log(`[${componentName}] Switched to model: ${model.name} (${model.provider})`);

            // Display a success toast notification
            ToastSuccessModelSwitch(model)
        } catch (error) {
            // Handle errors gracefully
            console.error(`[${componentName}] Failed to switch model:`, error);
            // Display an error toast notification
            ToastFailureGeneral(`Failed to switch to model: ${model.name}`)
        }
    };
}

export function useFilteredModels(search: string, activeKeys: string[]) {
    const filteredModels = useMemo(() => {
        const modelOptions = goose_models.filter((model) =>
            activeKeys.includes(model.provider)
        );

        if (!search) {
            return modelOptions; // Return all models if no search term
        }

        return modelOptions.filter((model) =>
            model.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [search, activeKeys]);

    return filteredModels;
}
