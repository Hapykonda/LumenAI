// app/panel/calibration/presets.ts
import type { CalibrationDoc } from "./types";

export type Preset = {
  id: string;
  name: string;
  patch: Partial<CalibrationDoc>;
};

export const PRESETS: Preset[] = [
  {
    id: "elite",
    name: "Vendedor Élite Ético",
    patch: {
      calibration: {
        personality: {
          mix: {
            joy: 45,
            energy: 55,
            sobriety: 35,
            elegance: 70,
            closeness: 65,
            empathy: 70,
            brevity: 65,
            directivity: 75,
            humor: 10,
            audacity: 35,
          } as any,
          rules: {
            reflectUnderstandingFirst: true,
            maxOptions: 2,
            endWithQuestionOrCTA: true,
          } as any,
          freeNotes: "",
        } as any,
        sales: {
          qualification: "medium",
          proactivity: 75,
          closing: 80,
          allowUrgency: false,
          objectionHandling: { price: true, time: true, trust: true, comparison: true },
        },
      } as any,
    },
  },
  {
    id: "corporate",
    name: "Formal Corporativo",
    patch: {
      calibration: {
        personality: {
          mix: {
            joy: 15,
            energy: 35,
            sobriety: 80,
            elegance: 70,
            closeness: 35,
            empathy: 45,
            brevity: 55,
            directivity: 60,
            humor: 0,
            audacity: 15,
          } as any,
        } as any,
      } as any,
      widget: { theme: { material: "dark" } } as any,
    } as any,
  },
  {
    id: "close",
    name: "Profesional Cercano",
    patch: {
      calibration: {
        personality: {
          mix: {
            joy: 55,
            energy: 55,
            sobriety: 35,
            elegance: 55,
            closeness: 80,
            empathy: 80,
            brevity: 60,
            directivity: 65,
            humor: 15,
            audacity: 25,
          } as any,
        } as any,
      } as any,
    } as any,
  },
];

function isObj(v: any) {
  return v && typeof v === "object" && !Array.isArray(v);
}
function deepMerge(a: any, b: any) {
  if (!isObj(a) || !isObj(b)) return b;
  const out: any = { ...a };
  for (const k of Object.keys(b)) {
    out[k] = isObj(out[k]) && isObj(b[k]) ? deepMerge(out[k], b[k]) : b[k];
  }
  return out;
}

export function applyPreset(current: CalibrationDoc, preset: Preset): CalibrationDoc {
  return deepMerge(current, preset.patch);
}