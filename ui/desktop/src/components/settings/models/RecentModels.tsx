import React from 'react';
import { Clock } from 'lucide-react';
import { recent_models} from "./hardcoded_stuff";

// TODO: models -- dynamically create this
export function RecentModels() {
    return (
        <div className="space-y-2">
            {recent_models.map((model) => (
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
                        {model.lastUsed}
                    </div>
                </div>
            ))}
        </div>
    )
}

