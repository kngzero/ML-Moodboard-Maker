import React from "react";

export const TEMPLATES = [
  { id: "custom", name: "Custom" },
  { id: "ig-square", name: "IG Square", columns: 3, gap: 4, padding: 0, canvasWidth: 1080, canvasHeight: 1080 },
  { id: "ig-post", name: "IG Post", columns: 3, gap: 4, padding: 0, canvasWidth: 1080, canvasHeight: 1350 },
  { id: "16-9", name: "16:9", columns: 4, gap: 12, padding: 24, canvasWidth: 1920, canvasHeight: 1080, aspectRatio: 16 / 9 },
  { id: "pinterest", name: "Pinterest", columns: 3, gap: 8, padding: 20, canvasWidth: 1000, canvasHeight: 1500, aspectRatio: 2 / 3 },
];

export default function TemplateSelector({ value, onChange }) {
  return (
    <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
      {TEMPLATES.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}
