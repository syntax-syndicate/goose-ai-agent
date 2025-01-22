import React, { useState } from "react";
import { useModel } from "./settings/models/ModelContext";
import { useRecentModels } from "./settings/models/RecentModels"; // Hook for recent models
import { ChevronUp, ChevronDown, Settings } from "lucide-react";

export default function BottomMenu({ hasMessages }) {
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const { currentModel } = useModel();
  const { recentModels } = useRecentModels(); // Get recent models

  return (
    <div className="flex justify-between relative border-t dark:border-gray-700 text-bottom-menu dark:text-bottom-menu-dark pl-[15px] text-[10px] h-[30px] leading-[30px] align-middle bg-bottom-menu-background dark:bg-bottom-menu-background-dark rounded-b-2xl">
      {/* Directory Chooser */}
      <span
        className="cursor-pointer"
        onClick={async () => {
          console.log("Opening directory chooser");
          if (hasMessages) {
            window.electron.directoryChooser();
          } else {
            window.electron.directoryChooser(true);
          }
        }}
      >
        Working in {window.appConfig.get("GOOSE_WORKING_DIR")}
      </span>

      {/* Model Selector Dropdown */}
      <div className="relative flex items-center ml-auto mr-4">
        <div
          className="flex items-center cursor-pointer"
          onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
        >
          <span>{currentModel?.name || "Select Model"}</span>
          {isModelMenuOpen ? (
            <ChevronUp className="w-4 h-4 ml-1" />
          ) : (
            <ChevronDown className="w-4 h-4 ml-1" />
          )}
        </div>

        {/* Dropdown Menu */}
        {isModelMenuOpen && (
          <div className="absolute bottom-[30px] right-0 w-[300px] bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-lg">
            <div className="p-2">
              {/* Render recent models directly without timestamps */}
              <div className="space-y-2">
                {recentModels.map((model) => (
                  <label
                    key={model.name}
                    className="block cursor-pointer"
                  >
                    <div
                      className="flex items-center justify-between p-4 transition-colors
                        hover:text-gray-900 dark:hover:text-white"
                      onClick={() => console.log(`Model "${model.name}" selected.`)}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <input
                            type="radio"
                            name="recentModels"
                            value={model.name}
                            checked={currentModel?.name === model.name}
                            onChange={() => console.log(`Switching to model "${model.name}"`)}
                            className="peer sr-only"
                          />
                          <div className="h-4 w-4 rounded-full border border-gray-400 dark:border-gray-500
                            peer-checked:border-[6px] peer-checked:border-black dark:peer-checked:border-white
                            peer-checked:bg-white dark:peer-checked:bg-black
                            transition-all duration-200 ease-in-out"
                          ></div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">{model.name}</p>
                          <p className="font-medium">{model.provider}</p>
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <div
                className="flex items-center p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => window.electron.openSettings("models")}
              >
                <Settings className="w-4 h-4 mr-2" />
                <span>Tools and Settings</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
