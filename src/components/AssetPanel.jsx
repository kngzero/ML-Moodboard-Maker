import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronRight } from "lucide-react";

const cx = (...cls) => cls.filter(Boolean).join(" ");

/**
 * @typedef {{id:string, src:string, name:string}} Asset
 */

export default function AssetPanel({ assets, open, onClose }) {
  const [query, setQuery] = useState("");
  const filtered = assets.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div
      className={cx(
        "fixed inset-y-0 right-0 w-64 bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-700 transition-transform transform z-40",
        open ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Assets</h2>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close assets">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Input
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 text-sm"
        />
      </div>
      <div className="p-4 grid grid-cols-2 gap-2 overflow-y-auto" style={{ maxHeight: "calc(100% - 88px)" }}>
        {filtered.map((asset) => (
          <img
            key={asset.id}
            src={asset.src}
            alt={asset.name}
            className="w-full h-24 object-cover rounded-md cursor-grab"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("application/x-asset-id", asset.id);
              e.dataTransfer.effectAllowed = "copy";
            }}
          />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-2 text-sm text-neutral-500">No assets</p>
        )}
      </div>
    </div>
  );
}
