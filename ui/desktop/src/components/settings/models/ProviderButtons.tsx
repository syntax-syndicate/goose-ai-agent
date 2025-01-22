import React from 'react';
import { Button } from "../../ui/button"
import { useActiveKeys } from "../api_keys/ActiveKeysContext";

export function ProviderButtons() {
    const { activeKeys } = useActiveKeys();
    console.log("Active keys in ProviderButtons:", activeKeys);

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {activeKeys.map((provider) => (
                <Button
                    key={provider}
                    variant="outline"
                    className="h-20 border-muted-foreground/20"
                    onClick={() => console.log("expand provider")}
                >
                    {provider}
                </Button>
            ))}
        </div>
    )
}