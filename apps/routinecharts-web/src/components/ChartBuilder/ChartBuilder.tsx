import { useState } from "react";
import { trackEvent } from "@one-colored-pixel/satellite-shared/analytics";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableRow } from "./SortableRow";
import { DEFAULT_ROWS } from "./icons";
import type { ChartConfig, ChartRow } from "./types";

const makeRow = (partial: Omit<ChartRow, "id">): ChartRow => ({
  id: crypto.randomUUID(),
  ...partial,
});

export const ChartBuilder = () => {
  const [config, setConfig] = useState<ChartConfig>({
    childName: "",
    title: "Morning Routine",
    rows: DEFAULT_ROWS.map(makeRow),
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    // Desktop: small drag distance to start.
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Touch: press-and-hold to drag so vertical scroll still works.
    // 200ms delay + small tolerance is the dnd-kit touch recommendation.
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setConfig((prev) => {
      const oldIndex = prev.rows.findIndex((row) => row.id === active.id);
      const newIndex = prev.rows.findIndex((row) => row.id === over.id);
      return { ...prev, rows: arrayMove(prev.rows, oldIndex, newIndex) };
    });
  };

  const updateRow = (id: string, patch: Partial<ChartRow>) => {
    setConfig((prev) => ({
      ...prev,
      rows: prev.rows.map((row) =>
        row.id === id ? { ...row, ...patch } : row,
      ),
    }));
  };

  const removeRow = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      rows: prev.rows.filter((row) => row.id !== id),
    }));
  };

  const addRow = () => {
    setConfig((prev) => ({
      ...prev,
      rows: [...prev.rows, makeRow({ label: "", icon: "🪥", time: "" })],
    }));
    trackEvent("chart_row_added");
  };

  const generatePdf = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/generate-chart-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!response.ok) {
        throw new Error(`PDF generation failed (${response.status})`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const fileName = config.childName
        ? `${config.childName.toLowerCase().replace(/\s+/g, "-")}-routine-chart.pdf`
        : "routine-chart.pdf";
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      trackEvent("pdf_download", { rows: config.rows.length });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5 block">
            Child's name
          </span>
          <input
            type="text"
            value={config.childName}
            onChange={(event) =>
              setConfig((prev) => ({ ...prev, childName: event.target.value }))
            }
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            placeholder="Optional"
          />
        </label>
        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5 block">
            Chart title
          </span>
          <input
            type="text"
            value={config.title}
            onChange={(event) =>
              setConfig((prev) => ({ ...prev, title: event.target.value }))
            }
            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
          />
        </label>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={config.rows.map((row) => row.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {config.rows.map((row) => (
              <SortableRow
                key={row.id}
                row={row}
                onChange={updateRow}
                onRemove={removeRow}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={addRow}
        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-medium text-slate-500 hover:text-brand hover:bg-brand-tint rounded-xl transition-colors"
      >
        <span className="text-lg leading-none">+</span> Add activity
      </button>

      <div className="pt-2">
        {error && (
          <p className="text-red-600 text-sm mb-3" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={generatePdf}
          disabled={isGenerating || config.rows.length === 0}
          className="w-full bg-brand hover:bg-brand-strong disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold px-6 py-3.5 rounded-xl shadow-sm hover:shadow transition-all"
        >
          {isGenerating ? "Generating PDF..." : "Download printable chart"}
        </button>
        <p className="text-xs text-slate-500 text-center mt-3">
          Free forever. No signup. No email. Includes a coloring page reward.
        </p>
      </div>
    </div>
  );
};
