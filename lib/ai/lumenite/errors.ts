import { BusinessAuthorizationError } from "@/lib/auth/business-context";

export class LumeniteSafeError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 400, code = "LUMENITE_OPERATION_FAILED") {
    super(message);
    this.name = "LumeniteSafeError";
    this.status = status;
    this.code = code;
  }
}

export function safeErrorMessage(error: unknown, fallback = "Error operativo de LumenAI") {
  if (error instanceof BusinessAuthorizationError) return error.message;
  if (error instanceof LumeniteSafeError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function safeErrorStatus(error: unknown, fallback = 500) {
  if (error instanceof BusinessAuthorizationError) return error.status;
  if (error instanceof LumeniteSafeError) return error.status;
  return fallback;
}

export function safeErrorCode(error: unknown, fallback = "LUMENITE_OPERATION_FAILED") {
  if (error instanceof BusinessAuthorizationError) return error.code;
  if (error instanceof LumeniteSafeError) return error.code;
  return fallback;
}
