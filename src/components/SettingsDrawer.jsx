import React from "react";
import { Settings2 } from "lucide-react";

const cx = (...cls) => cls.filter(Boolean).join(" ");

export default function SettingsDrawer({ open, onToggle, children }) {
  return (
    <div className="fixed right-0 z-40 flex bottom-0" style={{ top: "var(--header-height)" }}>
      <button
        className="h-10 w-10 mt-4 flex items-center justify-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-l-md shadow-md"
        onClick={onToggle}
        aria-label={open ? "Close settings" : "Open settings"}
      >
        <Settings2 className="h-5 w-5" />
      </button>
      <div
        className={cx(
          "h-full flex flex-col bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-700 transition-all overflow-y-auto",
          open ? "w-80 p-4" : "w-0 p-0"
        )}
      >
        {open && children}
      </div>
    </div>
  );
}
