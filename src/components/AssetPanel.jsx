import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, LayoutGrid, Trash2 } from "lucide-react";

const cx = (...cls) => cls.filter(Boolean).join(" ");

/**
 * @typedef {{id:string, src:string, name:string, w?:number, h?:number}} Asset
 */

export default function AssetPanel({ assets, open, onToggle, onRemoveAsset, onClearAssets }) {
  const [query, setQuery] = useState("");
  const filtered = assets.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed left-0 z-40 flex bottom-0" style={{ top: "var(--header-height)" }}>
      <div
        className={cx(
          "h-full flex flex-col bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-700 transition-all overflow-hidden",
          open ? "w-64" : "w-0"
        )}
      >
        {open && (
          <>
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between mb-3 gap-2">
                <h2 className="font-semibold">Assets</h2>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClearAssets}
                    aria-label="Remove all assets"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Input
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="p-4 flex flex-col gap-2 overflow-y-auto flex-1">
              {filtered.map((asset) => (
                <div key={asset.id} className="relative group">
                  <img
                    src={asset.src}
                    alt={asset.name}
                    width={asset.w}
                    height={asset.h}
                    className="max-w-full h-auto object-contain rounded-md cursor-grab"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("application/x-asset-id", asset.id);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                  />
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => onRemoveAsset(asset.id)}
                    aria-label="Remove asset"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-sm text-neutral-500">No assets</p>
              )}
            </div>
          </>
        )}
      </div>
      <button
        className="h-10 w-10 mt-4 flex items-center justify-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-r-md shadow-md"
        onClick={onToggle}
        aria-label={open ? "Close assets" : "Open assets"}
      >
        <LayoutGrid className="h-5 w-5" />
      </button>
    </div>
  );
}
