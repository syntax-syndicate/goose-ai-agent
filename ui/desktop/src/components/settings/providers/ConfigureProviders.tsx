import React from "react";
import { Providers } from "./Providers"
import { Header } from "./ProviderHeaders"

export function ProvidersPage() {
    return (
        <div className="container mx-auto py-6 max-w-4xl">
            <Header />
            <Providers />
        </div>
    )
}