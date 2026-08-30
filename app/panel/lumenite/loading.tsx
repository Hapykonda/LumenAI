import { LumenSystemState } from "@/components/ui/lumen-system-state";

export default function LumeniteLoading() {
  return (
    <div className="grid min-h-[70vh] place-items-center">
      <LumenSystemState
        state="analysing"
        title="Preparando LumenAI Action OS"
        description="Recuperando capacidades, políticas y acciones recientes."
        className="w-full max-w-2xl"
      />
    </div>
  );
}
