import  React, { useState, useEffect, useRef } from "react"
import { Search } from 'lucide-react'
import { Switch } from "../../ui/switch"
import { toast } from "react-toastify"
import { models } from "./hardcoded_stuff"
import { useHandleModelSelection } from "./utils";

export function SearchBar({ onModelChange }: { onModelChange: (modelId: number) => void }) {
    const [search, setSearch] = useState("")
    const [focusedIndex, setFocusedIndex] = useState(-1)
    const [activeModel, setActiveModel] = useState(models.find(m => m.active)?.id)
    const [showResults, setShowResults] = useState(false)
    const resultsRef = useRef<(HTMLDivElement | null)[]>([])
    const searchBarRef = useRef<HTMLDivElement>(null)
    const handleModelSelection = useHandleModelSelection(); // Use the utility hook


    const filteredModels = models
        .filter((model) => model.name.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 5)

    useEffect(() => {
        setFocusedIndex(-1)
    }, [search])

    // FIXME: errors
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchBarRef.current && !searchBarRef.current.contains(event.target as Node)) {
                setShowResults(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    // FIXME: arrow keys not responding but esc works
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
        }
    }

    useEffect(() => {
        if (focusedIndex >= 0 && focusedIndex < resultsRef.current.length) {
            resultsRef.current[focusedIndex]?.scrollIntoView({
                block: 'nearest',
            })
        }
    }, [focusedIndex])

    // TODO: handle darkmode
    return (
        <div className="relative" ref={searchBarRef}>
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/>
            <input
                type="text"
                placeholder="Search models..."
                value={search}
                onChange={(e) => {
                    setSearch(e.target.value);
                    setShowResults(true);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setShowResults(true)}
                className="w-full pl-12 py-2 bg-background border border-muted-foreground/20 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {showResults && search && (
                <div
                    className="absolute z-10 w-full mt-2 bg-white border border-muted-foreground/20 rounded-md shadow-lg">
                    {filteredModels.length > 0 ? (
                        filteredModels.map((model, index) => (
                            <div
                                key={model.id}
                                ref={(el) => (resultsRef.current[index] = el)}
                                className={`p-2 flex justify-between items-center hover:bg-muted/50 cursor-pointer ${
                                    index === focusedIndex ? 'bg-muted/50' : ''
                                }`}
                                onClick={() => handleModelSelection(model, "SearchBar")} // Use the hook
                            >
                                <div>
                                    <span className="font-medium">{model.name}</span>
                                    <span className="ml-2 text-xs text-gray-500 italic">
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