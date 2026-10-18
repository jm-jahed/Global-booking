export interface DatabaseConnectionSettings {
  readonly provider: string;
  readonly connectionStringEnvironmentVariable: string;
}

export interface DatabasePort {
  readonly providerName: string;
  connect(settings: DatabaseConnectionSettings): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

export const FUTURE_MONGODB_SETTINGS: DatabaseConnectionSettings = {
  provider: "mongodb",
  connectionStringEnvironmentVariable: "MONGODB_URI",
};

// No DatabasePort implementation is provided in Phase 1. This module defines
// only the boundary that a separately approved persistence adapter must follow.
