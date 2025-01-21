import React, { useState, useEffect } from "react"
import { Clock } from 'lucide-react';
import { Model } from "./ModelContext"

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
    const { recentModels } = useRecentModels(); // Access the recent models from the hook

    return (
        <div className="space-y-2">
            {recentModels.map((model) => (
                <div
                    key={model.name}
                    className="flex items-center justify-between p-4 rounded-lg border border-muted-foreground/20 bg-background hover:bg-muted/50 transition-colors"
                >
                    <div className="space-y-1">
                        <p className="font-medium">{model.name}</p>
                        <p className="text-sm text-muted-foreground">{model.provider}</p>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 mr-2" />
                        {model.lastUsed ? new Date(model.lastUsed).toLocaleString() : "N/A"}
                    </div>
                </div>
            ))}
        </div>
    );
}

