export interface BackendHealth {
  readonly status: "ok";
  readonly service: "global-booking";
  readonly timestamp: string;
}

export interface ApiErrorPayload {
  readonly status: "error";
  readonly error: "frontend_configuration_error" | "backend_unavailable";
}
