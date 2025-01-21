"use client"

import * as React from "react"
import { Check, ChevronDown, Edit2, Plus, X } from "lucide-react"
import { Button } from "../../ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@radix-ui/react-accordion"

interface Provider {
    id: string
    name: string
    keyName: string
    isConfigured: boolean
    description: string
}

const providers: Provider[] = [
    {
        id: "openai",
        name: "OpenAI",
        keyName: "OPENAI_API_KEY",
        isConfigured: true,
        description: "Access GPT-4, GPT-3.5 Turbo, and other OpenAI models",
    },
    {
        id: "anthropic",
        name: "Anthropic",
        keyName: "ANTHROPIC_API_KEY",
        isConfigured: false,
        description: "Access Claude and other Anthropic models",
    },
    {
        id: "google",
        name: "Google AI",
        keyName: "GOOGLE_API_KEY",
        isConfigured: false,
        description: "Access Gemini and other Google AI models",
    },
    {
        id: "mistral",
        name: "Mistral AI",
        keyName: "MISTRAL_API_KEY",
        isConfigured: true,
        description: "Access Mistral's large language models",
    },
]

export function Providers() {
    const [selectedProvider, setSelectedProvider] = React.useState<Provider | null>(null)
    const [isModalOpen, setIsModalOpen] = React.useState(false)

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
                                    <div className="text-sm">
                                        <span className="text-gray-500 dark:text-gray-400">API Key Name: </span>
                                        <code className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{provider.keyName}</code>
                                    </div>
                                    {provider.isConfigured ? (
                                        <div className="flex items-center gap-3">
                                            <Button
                                                variant="outline"
                                                size="default"
                                                onClick={() => {
                                                    setSelectedProvider(provider)
                                                    setIsModalOpen(true)
                                                }}
                                                className="text-gray-700 dark:text-gray-300"
                                            >
                                                <Edit2 className="h-4 w-4 mr-2" />
                                                Edit Key
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="default"
                                                onClick={() => {
                                                    // Handle delete
                                                }}
                                                className="text-red-600 hover:text-red-700 dark:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50"
                                            >
                                                Delete Key
                                            </Button>
                                        </div>
                                    ) : (
                                        <Button
                                            variant="default"
                                            size="default"
                                            onClick={() => {
                                                setSelectedProvider(provider)
                                                setIsModalOpen(true)
                                            }}
                                            className="text-indigo-50 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700 w-fit"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Add Key
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                ))}
            </Accordion>
        </div>
    )
}