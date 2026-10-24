/**
 * GLOBAL BOOKING — Production PM2 Ecosystem Configuration
 * Target Host: Contabo Ubuntu/Debian VPS
 *
 * Applications:
 * 1. global-booking-api: Fastify REST API server (Bound to loopback 127.0.0.1:5060)
 * 2. global-booking-web: Next.js Frontend Web Application (Bound to loopback 127.0.0.1:3020)
 *
 * Security Note:
 * Secrets, database URIs, and JWT/Cookie keys are NEVER embedded in this file.
 * Each application securely loads its credentials from its server-side .env file.
 */

module.exports = {
  apps: [
    {
      name: "global-booking-api",
      cwd: "./global-booking-backend",
      script: "dist/src/server.js",
      node_args: "--env-file=.env",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      restart_delay: 2000,
      time: true,
      env: {
        NODE_ENV: "production",
        HOST: "127.0.0.1",
        PORT: 5060,
      },
    },
    {
      name: "global-booking-web",
      cwd: "./global-booking-frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3020 -H 127.0.0.1",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      restart_delay: 2000,
      time: true,
      env: {
        NODE_ENV: "production",
        PORT: 3020,
      },
    },
  ],
};
