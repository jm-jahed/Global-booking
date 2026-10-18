export type BackendHealthErrorKind =
  | "configuration"
  | "connection"
  | "upstream-response"
  | "invalid-response";

export class BackendHealthError extends Error {
  constructor(
    readonly kind: BackendHealthErrorKind,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "BackendHealthError";
  }
}
