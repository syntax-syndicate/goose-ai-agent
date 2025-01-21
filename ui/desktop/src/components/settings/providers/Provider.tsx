"use client";

import * as React from "react";
import { Check, ChevronDown, Edit2, Plus, X } from "lucide-react";
import { Button } from "../../ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@radix-ui/react-accordion";
import { supported_providers, required_keys, provider_aliases } from "../models/hardcoded_stuff";
import { useActiveKeys } from "../api_keys/ActiveKeysContext";

interface Provider {
    id: string;
    name: string;
    keyName: string[];
    isConfigured: boolean;
    description: string;
}

function getProviderDescription(provider: string): string {
    const descriptions: { [key: string]: string } = {
        "OpenAI": "Access GPT-4, GPT-3.5 Turbo, and other OpenAI models",
        "Anthropic": "Access Claude and other Anthropic models",
        "Google": "Access Gemini and other Google AI models",
        "Groq": "Access Mixtral and other Groq-hosted models",
        "Databricks": "Access models hosted on your Databricks instance",
        "OpenRouter": "Access a variety of AI models through OpenRouter",
        "Ollama": "Run and use open-source models locally",
    };
    return descriptions[provider] || `Access ${provider} models`;
}

export function Providers() {
    const { activeKeys } = useActiveKeys();// Fetch active keys from context
    console.log("activeKeys", activeKeys)
    const [selectedProvider, setSelectedProvider] = React.useState<Provider | null>(null);
    const [isModalOpen, setIsModalOpen] = React.useState(false);

    const providers: Provider[] = React.useMemo(() => {
        return supported_providers.map((providerName) => {
            const alias = provider_aliases.find((p) => p.provider === providerName)?.alias || providerName.toLowerCase();
            const requiredKeys = required_keys[providerName] || [];

            // Check if the provider name exists in activeKeys
            const isConfigured = activeKeys.includes(providerName);

            return {
                id: alias,
                name: providerName,
                keyName: requiredKeys,
                isConfigured,
                description: getProviderDescription(providerName),
            };
        });
    }, [activeKeys]);

    return (
        <div className="space-y-6">
            <div className="text-gray-500 dark:text-gray-400 mb-6">
                Configure your AI model providers by adding their API keys. Your keys are stored securely and encrypted locally.
            </div>

            <Accordion type="single" collapsible className="w-full space-y-4">
                {providers.map((provider) => (
                    <AccordionItem
                        key={provider.id}
                        value={provider.id}
                        className="border rounded-lg px-6 bg-white dark:bg-gray-800 shadow-sm"
                    >
                        <AccordionTrigger className="hover:no-underline py-4">
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-4">
                                    <div className="font-semibold text-gray-900 dark:text-gray-100">{provider.name}</div>
                                    {provider.isConfigured ? (
                                        <div className="flex items-center gap-1 text-sm text-green-600 dark:text-green-500">
                                            <Check className="h-4 w-4" />
                                            <span>Configured</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1 text-sm text-red-600 dark:text-red-500">
                                            <X className="h-4 w-4" />
                                            <span>Not Configured</span>
                                        </div>
                                    )}
                                </div>
                                <ChevronDown className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400 transition-transform duration-200" />
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4 pb-6">
                            <div className="space-y-6">
                                <p className="text-sm text-gray-600 dark:text-gray-300">{provider.description}</p>
                                <div className="flex flex-col space-y-4">
                                    {provider.keyName.length > 0 ? (
                                        <div className="text-sm space-y-2">
                                            <span className="text-gray-500 dark:text-gray-400">Required API Keys:</span>
                                            {provider.keyName.map((key) => (
                                                <div key={key} className="flex items-center gap-2">
                                                    <code className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{key}</code>
                                                    {activeKeys.includes(key) && (
                                                        <Check className="h-4 w-4 text-green-500" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            No API keys required
                                        </div>
                                    )}

                                    {provider.keyName.length > 0 && (
                                        <div className="flex items-center gap-3">
                                            {provider.isConfigured ? (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        size="default"
                                                        onClick={() => {
                                                            setSelectedProvider(provider);
                                                            setIsModalOpen(true);
                                                        }}
                                                        className="text-gray-700 dark:text-gray-300"
                                                    >
                                                        <Edit2 className="h-4 w-4 mr-2" />
                                                        Edit Keys
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="default"
                                                        onClick={() => {
                                                            // Handle delete
                                                        }}
                                                        className="text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50"
                                                    >
                                                        Delete Keys
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button
                                                    variant="default"
                                                    size="default"
                                                    onClick={() => {
                                                        setSelectedProvider(provider);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="text-indigo-50 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 w-fit"
                                                >
                                                    <Plus className="h-4 w-4 mr-2" />
                                                    Add Keys
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    );
}
