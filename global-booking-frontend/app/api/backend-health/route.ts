import { NextResponse } from "next/server";

import {
  BackendHealthError,
  fetchBackendHealth,
} from "../../../lib/backend-api";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const health = await fetchBackendHealth();
    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    if (error instanceof BackendHealthError) {
      const isConfigurationError = error.kind === "configuration";

      return NextResponse.json(
        {
          status: "error",
          error: isConfigurationError
            ? "frontend_configuration_error"
            : "backend_unavailable",
        },
        { status: isConfigurationError ? 500 : 502 },
      );
    }

    return NextResponse.json(
      { status: "error", error: "backend_unavailable" },
      { status: 502 },
    );
  }
}
