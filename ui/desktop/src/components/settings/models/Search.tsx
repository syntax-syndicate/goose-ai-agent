import  React, { useState, useEffect, useRef } from "react"
import { Search } from 'lucide-react'
import { Switch } from "../../ui/switch"
import { toast } from "react-toastify"
import { models } from "./hardcoded_stuff"

export function SearchBar({ onModelChange }: { onModelChange: (modelId: number) => void }) {
    const [search, setSearch] = useState("")
    const [focusedIndex, setFocusedIndex] = useState(-1)
    const [activeModel, setActiveModel] = useState(models.find(m => m.active)?.id)
    const [showResults, setShowResults] = useState(false)
    const resultsRef = useRef<(HTMLDivElement | null)[]>([])

    const filteredModels = models
        .filter((model) => model.name.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 5)

    useEffect(() => {
        setFocusedIndex(-1)
    }, [search])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault()
            setFocusedIndex(prev => (prev < filteredModels.length - 1 ? prev + 1 : prev))
            setShowResults(true)
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev))
            setShowResults(true)
        } else if (e.key === "Enter" && focusedIndex >= 0) {
            e.preventDefault()
            const selectedModel = filteredModels[focusedIndex]
            handleModelChange(selectedModel)
        } else if (e.key === "Escape") {
            e.preventDefault()
            setShowResults(false)
        }
    }

    const handleModelChange = (model: typeof models[0]) => {
        if (model.id !== activeModel) {
            setActiveModel(model.id)
            onModelChange(model.id)
            toast.success(`Switched to ${model.name}`, {
                position: "bottom-right",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
            });
        }
    }

    useEffect(() => {
        if (focusedIndex >= 0 && focusedIndex < resultsRef.current.length) {
            resultsRef.current[focusedIndex]?.scrollIntoView({
                block: 'nearest',
            })
        }
    }, [focusedIndex])

    return (
        <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
                type="text"
                placeholder="Search models..."
                value={search}
                onChange={(e) => {
                    setSearch(e.target.value)
                    setShowResults(true)
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowResults(true)}
                className="w-full pl-10 py-2 bg-background border border-muted-foreground/20 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {showResults && search && (
                <div className="absolute z-10 w-full mt-2 bg-background border border-muted-foreground/20 rounded-md shadow-lg">
                    {filteredModels.length > 0 ? (
                        filteredModels.map((model, index) => (
                            <div
                                key={model.id}
                                ref={el => resultsRef.current[index] = el}
                                className={`p-2 flex justify-between items-center hover:bg-muted/50 cursor-pointer ${
                                    index === focusedIndex ? 'bg-muted/50' : ''
                                }`}
                            >
                                <div>
                                    {model.name}
                                    <span className="ml-2 text-xs text-muted-foreground">
                    {model.provider}
                  </span>
                                </div>
                                <Switch
                                    checked={model.id === activeModel}
                                    onCheckedChange={() => handleModelChange(model)}
                                />
                            </div>
                        ))
                    ) : (
                        <div className="p-2 text-muted-foreground">No models found</div>
                    )}
                </div>
            )}
        </div>
    )
}