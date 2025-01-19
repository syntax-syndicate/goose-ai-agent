import { useModel } from "./ModelContext"; // Import the useModel hook
import { Model } from "./ModelContext";
import {ToastFailureGeneral, ToastSuccessModelSwitch} from "./toasts";

export function useHandleModelSelection() {
    const { switchModel } = useModel(); // Access switchModel via useModel

    return (model: Model, componentName?: string) => {
        try {
            // Call the context's switchModel to update the model
            switchModel(model);

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
