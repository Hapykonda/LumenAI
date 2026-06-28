export class LumeniteSafeError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "LumeniteSafeError";
    this.status = status;
  }
}

export function safeErrorMessage(error: unknown, fallback = "Error operativo de Lumenite") {
  if (error instanceof LumeniteSafeError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function safeErrorStatus(error: unknown, fallback = 500) {
  if (error instanceof LumeniteSafeError) return error.status;
  return fallback;
}
