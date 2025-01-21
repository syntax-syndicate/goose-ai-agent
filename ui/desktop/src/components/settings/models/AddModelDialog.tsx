"use client"

import React, { useState } from 'react';
import { Button } from "../../ui/button"
import {
    Modal,
    ModalContent,
    ModalDescription,
    ModalHeader,
    ModalTitle,
    ModalTrigger,
} from "../../ui/modal"
import Select from 'react-select';
import SelectItem from 'react-select';
import SelectTrigger from 'react-select';
import SelectContent from 'react-select';
import SelectValue from 'react-select';
import { Input } from "../../ui/input"
import { Label } from "../../ui/label"
import { Plus } from 'lucide-react'
import {supported_providers} from "./hardcoded_stuff";
import { useHandleModelSelection } from "./utils";
import { useActiveKeys } from "../api_keys/ActiveKeysContext";

// FIXME: dark mode (p0)
// TODO: set the model upon submit (p0)
export function AddModelDialog() {
    const { activeKeys } = useActiveKeys(); // Access active keys from context

    // Convert active keys to dropdown options
    const options = activeKeys.map((key) => ({
        value: key.toLowerCase(),
        label: key,
    }));

    const [selectedOption, setSelectedOption] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false); // Track modal visibility
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
    const [modelName, setModelName] = useState<string>("");
    const handleModelSelection = useHandleModelSelection();

    const handleCancel = () => {
        // Reset modal state
        setSelectedProvider(null);
        setModelName("");
        setIsModalOpen(false); // Close the modal
    };

    const handleSubmit = () => {
        if (!selectedProvider || !modelName) {
            console.error("Both provider and model name are required.");
            return;
        }

        // Construct a model object
        const newModel = {
            name: modelName,
            provider: selectedProvider,
        };

        // Trigger the model selection logic
        handleModelSelection(newModel, "AddModelDialog");

        // Reset modal state
        setSelectedProvider(null);
        setModelName("");
        setIsModalOpen(false); // Close the modal
    };

    const handleChange = (option) => {
        setSelectedOption(option);
        setSelectedProvider(option?.value || null); // Set selected provider based on dropdown value
    };

    return (
        <Modal open={isModalOpen} onOpenChange={setIsModalOpen}>
            <ModalTrigger asChild>
                <Button
                    className="bg-black hover:bg-black/90 text-white"
                    onClick={() => setIsModalOpen(true)} // Open the modal
                >
                    <Plus className="w-4 h-4 mr-2" /> Add Model
                </Button>
            </ModalTrigger>
            <ModalContent className="sm:max-w-[425px]">
                <ModalHeader>
                    <ModalTitle>Add New Model</ModalTitle>
                    <ModalDescription>
                        Change the underlying model by selecting a provider and entering the model name.
                    </ModalDescription>
                </ModalHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="provider">Provider</Label>
                        <Select
                            options={options}
                            value={selectedOption}
                            onChange={handleChange}
                            placeholder="Select provider"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="model">Model Name</Label>
                        <Input
                            id="model"
                            placeholder="Enter model name"
                            value={modelName}
                            onChange={(e) => setModelName(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3">
                    <Button variant="outline" onClick={handleCancel}>
                        Cancel
                    </Button>
                    <Button variant="outline">
                        Test Model
                    </Button>
                    <Button className="bg-black hover:bg-black/90 text-white" onClick={handleSubmit}>
                        Select Model
                    </Button>
                </div>
            </ModalContent>
        </Modal>
    );
}
