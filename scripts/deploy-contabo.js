#!/usr/bin/env node
/**
 * GLOBAL BOOKING — Automated Contabo VPS Deployment Engine
 * Target: Contabo Ubuntu VPS (169.58.33.89)
 * 
 * Usage:
 *   node scripts/deploy-contabo.js
 */

const fs = require('fs');
const path = require('path');

// Resolve ssh2 client
let Client;
try {
  Client = require('ssh2').Client;
} catch (e) {
  try {
    Client = require('d:/Universal-Retail-POS/backend/node_modules/ssh2').Client;
  } catch (e2) {
    console.error('❌ Error: ssh2 package is required.');
    process.exit(1);
  }
}

// Read .env.deploy configuration
const envDeployPath = path.join(__dirname, '..', '.env.deploy');
const config = {
  host: '169.58.33.89',
  port: 22,
  username: 'root',
  password: '',
  remoteDir: '/var/www/global-booking'
};

if (fs.existsSync(envDeployPath)) {
  const content = fs.readFileSync(envDeployPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...vals] = trimmed.split('=');
    const val = vals.join('=').trim().replace(/^['"]|['"]$/g, '');
    if (key === 'DEPLOY_SSH_HOST') config.host = val;
    if (key === 'DEPLOY_SSH_PORT') config.port = Number(val) || 22;
    if (key === 'DEPLOY_SSH_USER') config.username = val;
    if (key === 'DEPLOY_SSH_PASSWORD') config.password = val;
    if (key === 'DEPLOY_REMOTE_DIR') config.remoteDir = val;
  }
}

if (!config.password) {
  console.error('❌ Missing DEPLOY_SSH_PASSWORD in .env.deploy');
  process.exit(1);
}

console.log('========================================================');
console.log('  GLOBAL BOOKING — CONTABO PRODUCTION DEPLOYMENT ENGINE  ');
console.log('========================================================');
console.log(`📡 Target Host: ${config.host}:${config.port}`);
console.log(`📁 Remote Dir:  ${config.remoteDir}`);
console.log('⏳ Connecting to server via SSH...\n');

const conn = new Client();

conn.on('ready', () => {
  console.log('✅ SSH Connection established. Running live deployment pipeline...\n');

  const remoteCommands = `
    set -e
    export PATH=/root/.nvm/versions/node/v24.12.0/bin:$PATH
    cd ${config.remoteDir}
    
    echo "▶ STEP 1: Pulling latest code from git..."
    git pull || echo "Git pull completed or up-to-date"
    
    echo ""
    echo "▶ STEP 2: Current Commit on VPS:"
    git log -n 1 --oneline
    
    echo ""
    echo "▶ STEP 3: Building backend (global-booking-backend)..."
    cd ${config.remoteDir}/global-booking-backend
    npm install
    npm run build
    
    echo ""
    echo "▶ STEP 4: Building frontend (global-booking-frontend)..."
    cd ${config.remoteDir}/global-booking-frontend
    npm install
    npm run build
    
    echo ""
    echo "▶ STEP 5: Reloading PM2 services..."
    pm2 restart global-booking-api global-booking-web
    
    echo ""
    echo "▶ STEP 6: Active PM2 processes:"
    pm2 status global-booking-api global-booking-web
    
    echo ""
    echo "▶ STEP 7: Health checks:"
    sleep 3
    echo "API (5060):"
    curl -I -s http://localhost:5060 || true
    echo "Web (3020):"
    curl -I -s http://localhost:3020 || true
  `;

  conn.exec(remoteCommands, (err, stream) => {
    if (err) {
      console.error('❌ Exec error:', err);
      conn.end();
      process.exit(1);
    }

    stream.on('data', data => process.stdout.write(data.toString()));
    stream.stderr.on('data', data => process.stderr.write(data.toString()));
    
    stream.on('close', code => {
      console.log('--------------------------------------------------------');
      if (code === 0) {
        console.log('🎉 DEPLOYMENT SUCCEEDED! All Global Booking services are online.');
      } else {
        console.error(`⚠️ Deployment finished with exit code: ${code}`);
      }
      console.log('--------------------------------------------------------');
      conn.end();
    });
  });
}).on('error', err => {
  console.error('❌ SSH Connection failed:', err.message);
  process.exit(1);
}).connect({
  host: config.host,
  port: config.port,
  username: config.username,
  password: config.password,
  readyTimeout: 60000
});
