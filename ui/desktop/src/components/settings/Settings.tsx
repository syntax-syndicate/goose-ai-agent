import React, { useState, useEffect } from "react";
import { ScrollArea } from "../ui/scroll-area";
import { useNavigate, useLocation } from "react-router-dom";
import { Settings as SettingsType, Model, Extension } from "./types";
import { AddModelDialog } from "./modals/AddModelDialog";
import { AddExtensionDialog } from "./modals/AddExtensionDialog";
import { Modal, ModalContent, ModalHeader, ModalTitle } from "../ui/modal";
import { Button } from "../ui/button";
import { showToast } from "../ui/toast";
import BackButton from "../ui/BackButton";
import {RecentModelsRadio, useRecentModels} from "./models/RecentModels";
import { useHandleModelSelection} from "./models/utils";
import { ExtensionItem } from "./ExtensionItem";

const EXTENSIONS_DESCRIPTION =
    "The Model Context Protocol (MCP) is a system that allows AI models to securely connect with local or remote resources using standard server setups. It works like a client-server setup and expands AI capabilities using three main components: Prompts, Resources, and Tools.";

const DEFAULT_SETTINGS: SettingsType = {
  models: [
    {
      id: "gpt4",
      name: "GPT 4.0",
      description: "Standard config",
      enabled: false,
    },
    {
      id: "gpt4lite",
      name: "GPT 4.0 lite",
      description: "Standard config",
      enabled: false,
    },
    {
      id: "claude",
      name: "Claude",
      description: "Standard config",
      enabled: true,
    },
  ],
  extensions: []
};

export default function Settings() {
  const navigate = useNavigate();
  const location = useLocation();
  const { recentModels } = useRecentModels();
  const handleModelSelection = useHandleModelSelection();

  const [settings, setSettings] = React.useState<SettingsType>(() => {
    const saved = localStorage.getItem("user_settings");
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  // Persist settings changes
  React.useEffect(() => {
    localStorage.setItem("user_settings", JSON.stringify(settings));
  }, [settings]);

  const handleModelToggle = async (model: Model) => {
    try {
      await handleModelSelection(model, "Settings");
    } catch (error) {
      console.error("Failed to switch model:", error);
    }
  };

  const handleExtensionToggle = (extensionId: string) => {
    setSettings((prev) => ({
      ...prev,
      extensions: prev.extensions.map((ext) =>
          ext.id === extensionId ? { ...ext, enabled: !ext.enabled } : ext
      ),
    }));
  };

  const handleNavClick = (section: string, e: React.MouseEvent) => {
    e.preventDefault();
    const scrollArea = document.querySelector(
        "[data-radix-scroll-area-viewport]"
    );
    const element = document.getElementById(section.toLowerCase());

    if (scrollArea && element) {
      const topPos = element.offsetTop;
      scrollArea.scrollTo({
        top: topPos,
        behavior: "smooth",
      });
    }
  };

  const handleExit = () => {
    navigate("/chat/1", { replace: true });
  };

  const [addModelOpen, setAddModelOpen] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [configuringExtension, setConfiguringExtension] = useState<Extension | null>(null);

  // Handle URL parameters for auto-opening extension configuration
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const extensionId = params.get('extensionId');
    const showEnvVars = params.get('showEnvVars');

    if (extensionId && showEnvVars === 'true') {
      // Find the extension in settings
      const extension = settings.extensions.find(ext => ext.id === extensionId);
      if (extension) {
        // Auto-open the configuration modal
        setConfiguringExtension(extension);
        // Scroll to extensions section
        const element = document.getElementById('extensions');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  }, [location.search, settings.extensions]);

  const handleAddModel = (newModel: Model) => {
    setSettings((prev) => ({
      ...prev,
      models: [...prev.models, { ...newModel, enabled: false }],
    }));
    setAddModelOpen(false);
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setShowResetConfirm(false);
    showToast("Settings reset to default", "success");
  };

  const handleConfigureExtension = (extension: Extension) => {
    setConfiguringExtension(extension);
  };

  const handleExtensionConfigSubmit = (envVars: Record<string, string>) => {
    // Here you would typically save the environment variables
    // For now, we'll just show a success message
    showToast(`Configured ${configuringExtension?.name} with environment variables`, "success");
    setConfiguringExtension(null);
    
    // Clear the URL parameters after configuration
    navigate('/settings', { replace: true });
  };

  return (
    <div className="h-screen w-full pt-[36px]">
      <div className="h-full w-full bg-white dark:bg-gray-800 overflow-hidden p-2 pt-0">
        <ScrollArea className="h-full w-full">
          <div className="flex min-h-full">
            {/* Left Navigation */}
            <div className="w-48 border-r border-gray-100 dark:border-gray-700 px-2 pt-2">
              <div className="sticky top-8">
                <BackButton
                    onClick={() => {
                      handleExit();
                    }}
                    className="mb-4"
                />
                <div className="space-y-2">
                  {["Models", "Extensions"].map((section) => (
                      <button
                          key={section}
                          onClick={(e) => handleNavClick(section, e)}
                          className="block w-full text-left px-3 py-2 rounded-lg transition-colors
                                                  text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        {section}
                      </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 px-16 py-8 pt-[20px]">
              <div className="max-w-3xl space-y-12">
                {/* Models Section */}
                <section id="models">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold">Models</h2>
                    <button
                        onClick={() => navigate("/settings/more-models")}
                        className="text-indigo-500 hover:text-indigo-600 font-medium"
                    >
                      More Models
                    </button>
                  </div>
                  <RecentModelsRadio/>
                </section>

                {/* Extensions Section */}
                <section id="extensions">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold">Extensions</h2>
                    <button
                      onClick={() => window.electron.openInChrome("https://silver-disco-nvm6v4e.pages.github.io/")}
                      className="text-indigo-500 hover:text-indigo-600 font-medium"
                    >
                      Add Extensions
                    </button>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    {EXTENSIONS_DESCRIPTION}
                  </p>
                  {settings.extensions.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                      No Extensions Added Yet
                    </p>
                  ) : (
                    settings.extensions.map((ext) => (
                      <ExtensionItem
                        key={ext.id}
                        {...ext}
                        onToggle={handleExtensionToggle}
                        onConfigure={handleConfigureExtension}
                      />
                    ))
                  )}
                </section>

                {/* Reset Button */}
                <div className="pt-8 border-t border-gray-200 dark:border-gray-700">
                  <Button
                      onClick={() => setShowResetConfirm(true)}
                      variant="destructive"
                      className="w-full"
                  >
                    Reset to Default Settings
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      <Modal open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Reset Settings</ModalTitle>
          </ModalHeader>
          <div className="py-4">
            <p className="text-gray-600 dark:text-gray-300">
              Are you sure you want to reset all settings to their default
              values? This cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
                variant="outline"
                onClick={() => setShowResetConfirm(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReset}>
              Reset Settings
            </Button>
          </div>
        </ModalContent>
      </Modal>

      <AddModelDialog
          isOpen={addModelOpen}
          onClose={() => setAddModelOpen(false)}
          onAdd={handleAddModel}
      />

      <AddExtensionDialog
        isOpen={!!configuringExtension}
        onClose={() => {
          setConfiguringExtension(null);
          // Clear URL parameters when closing manually
          navigate('/settings', { replace: true });
        }}
        extension={configuringExtension}
        onSubmit={handleExtensionConfigSubmit}
      />
    </div>
  );
}