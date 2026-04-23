export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown,
    public readonly expose = true,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
