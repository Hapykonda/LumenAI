import type { adminClient } from "@/app/api/panel/calibration/_lib";
import type {
  LumeniteAccessType,
  LumeniteActionSource,
  LumeniteActionStatus,
  LumeniteApprovalMode,
  LumeniteRiskLevel,
  ValidationResult,
} from "./core";

export type LumeniteAdmin = ReturnType<typeof adminClient>;

export type LumenitePermissionScope =
  | "tasks:create"
  | "leads:notes:create"
  | "conversations:drafts:create"
  | "conversations:tags:create"
  | "reminders:create"
  | "email:drafts:create";

export type LumeniteSchema<T> = {
  name: string;
  shape: Record<string, string>;
  safeParse: (value: unknown) => ValidationResult<T>;
};

export type LumeniteRetryPolicy = {
  maxAttempts: number;
  backoffMs: number;
  retryableCodes: string[];
};

export type LumeniteRedactionRule = {
  field: string;
  strategy: "mask" | "truncate" | "remove";
  visibleCharacters?: number;
};

export type LumeniteExecutionContext = {
  admin: LumeniteAdmin;
  businessId: string;
  userId: string;
  runId: string;
  integrationId: string | null;
};

export type LumeniteExecutionResult<TOutput> = {
  output: TOutput;
  externalReference?: string | null;
  undoPayload?: Record<string, unknown>;
};

export type LumeniteVerificationResult = {
  verified: boolean;
  checkedAt: string;
  summary: string;
  evidence: Record<string, unknown>;
};

export type LumeniteActionDefinition<TInput = unknown, TOutput = unknown> = {
  id: string;
  name: string;
  description: string;
  category: "task" | "lead" | "conversation" | "reminder" | "email";
  provider: "lumenai_internal" | "google_gmail";
  resourceType: string;
  accessType: LumeniteAccessType;
  inputSchema: LumeniteSchema<TInput>;
  outputSchema: LumeniteSchema<TOutput>;
  requiredScopes: LumenitePermissionScope[];
  riskLevel: LumeniteRiskLevel;
  approvalMode: LumeniteApprovalMode;
  supportsDryRun: boolean;
  supportsUndo: boolean;
  timeout: number;
  retryPolicy: LumeniteRetryPolicy;
  executor: (
    context: LumeniteExecutionContext,
    input: TInput,
  ) => Promise<LumeniteExecutionResult<TOutput>>;
  verifier: (
    context: LumeniteExecutionContext,
    output: TOutput,
  ) => Promise<LumeniteVerificationResult>;
  undo?: (
    context: LumeniteExecutionContext,
    undoPayload: Record<string, unknown>,
  ) => Promise<LumeniteVerificationResult>;
  redactionRules: LumeniteRedactionRule[];
};

export type LumenitePlannedAction = {
  capability: string;
  input: Record<string, unknown>;
  reason: string;
  expectedResult: string;
};

export type LumenitePlanStep = {
  id: string;
  label: string;
  description: string;
  capability: string;
  status: "ready" | "blocked";
};

export type LumenitePlan = {
  agent: string;
  intent: string;
  objective: string;
  summary: string;
  source: LumeniteActionSource;
  riskLevel: LumeniteRiskLevel;
  dataUsed: string[];
  integrations: string[];
  expectedResult: string;
  steps: LumenitePlanStep[];
  actions: LumenitePlannedAction[];
  missingData: string[];
  warnings: string[];
  version?: number;
  rootPlanId?: string | null;
  parentPlanId?: string | null;
  changeRequest?: string | null;
};

export type LumeniteActionRun = {
  id: string;
  planId: string | null;
  signalId: string | null;
  businessId: string;
  requestedBy: string | null;
  approvedBy: string | null;
  source: LumeniteActionSource;
  capability: string;
  integrationId: string | null;
  riskLevel: LumeniteRiskLevel;
  status: LumeniteActionStatus;
  inputRedacted: Record<string, unknown>;
  planSnapshot: Record<string, unknown>;
  permissionSnapshot: Record<string, unknown>;
  idempotencyKey: string;
  externalReference: string | null;
  startedAt: string | null;
  completedAt: string | null;
  failedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  revocationRequestedAt: string | null;
  revocationReason: string | null;
  verificationResult: Record<string, unknown>;
  receipt: Record<string, unknown>;
  undoStatus: "not_available" | "available" | "requested" | "reverted" | "failed";
  createdAt: string;
  updatedAt: string;
};

export type LumeniteApprovalDecision =
  | "pending"
  | "approved"
  | "rejected"
  | "changes_requested"
  | "expired";

export type LumeniteApprovalInboxItem = {
  id: string;
  decision: LumeniteApprovalDecision;
  reason: string | null;
  requestedFrom: string | null;
  decidedBy: string | null;
  expiresAt: string | null;
  decidedAt: string | null;
  createdAt: string;
  planVersion: number;
  requesterName: string;
  businessName: string;
  integrationName: string | null;
  run: LumeniteActionRun;
};
