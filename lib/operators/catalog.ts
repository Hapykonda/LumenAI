export const OPERATOR_IDS = [
  "pulse",
  "miu",
  "nubi",
  "orbit",
  "luma",
  "bit",
  "flori",
] as const;

export type OperatorId = (typeof OPERATOR_IDS)[number];

export const OPERATOR_MOODS = [
  "welcome",
  "good-news",
  "bad-news",
  "thinking",
  "analyzing",
  "explaining",
  "celebrating",
  "working",
  "dancing",
] as const;

export type OperatorMood = (typeof OPERATOR_MOODS)[number];

export type LumenOperator = {
  id: OperatorId;
  name: string;
  role: string;
  personality: string;
  accent: string;
};

export const LUMEN_OPERATORS: readonly LumenOperator[] = [
  {
    id: "pulse",
    name: "Pulse Nova",
    role: "Guía principal",
    personality: "Curioso, optimista y estratégico",
    accent: "#56E9FF",
  },
  {
    id: "miu",
    name: "Miu",
    role: "Compañero cercano",
    personality: "Amable, ágil y conversador",
    accent: "#B79CFF",
  },
  {
    id: "nubi",
    name: "Nubi",
    role: "Asistente sereno",
    personality: "Calmado, claro y paciente",
    accent: "#8FEAFF",
  },
  {
    id: "orbit",
    name: "Orbit",
    role: "Analista de señales",
    personality: "Observador, preciso y reflexivo",
    accent: "#FFD665",
  },
  {
    id: "luma",
    name: "Luma",
    role: "Impulsor creativo",
    personality: "Enérgico, directo e inspirador",
    accent: "#FF8B72",
  },
  {
    id: "bit",
    name: "Bit",
    role: "Operador técnico",
    personality: "Ordenado, confiable y resolutivo",
    accent: "#7CF1B4",
  },
  {
    id: "flori",
    name: "Flori",
    role: "Guía de crecimiento",
    personality: "Positiva, cuidadosa y empática",
    accent: "#AFA1FF",
  },
] as const;

const OPERATOR_SET = new Set<string>(OPERATOR_IDS);

export function normalizeOperatorId(value: unknown): OperatorId {
  const candidate = String(value ?? "").trim().toLowerCase();
  return OPERATOR_SET.has(candidate) ? (candidate as OperatorId) : "pulse";
}

export function operatorAsset(
  operator: OperatorId | string | null | undefined,
  mood: OperatorMood = "welcome",
) {
  return `/brand/operators/${normalizeOperatorId(operator)}/${mood}.webp`;
}

export function getOperator(operator: OperatorId | string | null | undefined) {
  const id = normalizeOperatorId(operator);
  return LUMEN_OPERATORS.find((item) => item.id === id) ?? LUMEN_OPERATORS[0];
}
