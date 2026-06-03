const fs = require('fs');
const path = require('path');

// Check for --force flag
const force = process.argv.includes('--force');

const services = [
  { dir: '.', file: '.env.example', target: '.env', displayName: 'Root .env' },
  { dir: 'payment-platform-core', file: '.env.example', target: '.env', displayName: 'payment-platform-core/.env' },
  { dir: 'payment-platform-portal', file: '.env.example', target: '.env', displayName: 'payment-platform-portal/.env' },
  { dir: 'payment-platform-sdk', file: '.env.example', target: '.env', displayName: 'payment-platform-sdk/.env' },
  { dir: 'services/audit-service', file: '.env.example', target: '.env', displayName: 'services/audit-service/.env' },
  { dir: 'services/invoice-service', file: '.env.example', target: '.env', displayName: 'services/invoice-service/.env' },
  { dir: 'services/notification-service', file: '.env.example', target: '.env', displayName: 'services/notification-service/.env' },
  { dir: 'services/reporting-service', file: '.env.example', target: '.env', displayName: 'services/reporting-service/.env' },
  { dir: 'services/settlement-service', file: '.env.example', target: '.env', displayName: 'services/settlement-service/.env' }
];

let success = true;

for (const service of services) {
  const examplePath = path.join(service.dir, service.file);
  const envPath = path.join(service.dir, service.target);

  if (!fs.existsSync(examplePath)) {
    console.error(`❌ Example file not found: ${examplePath}`);
    success = false;
    continue;
  }

  if (fs.existsSync(envPath) && !force) {
    console.log(`- ${service.displayName} already exists (skipped)`);
  } else {
    try {
      const targetDir = path.dirname(envPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.copyFileSync(examplePath, envPath);
      const action = fs.existsSync(envPath) && force ? 'overwritten' : 'created';
      console.log(`✓ ${service.displayName} ${action}`);
    } catch (err) {
      console.error(`❌ Failed to copy to ${envPath}: ${err.message}`);
      success = false;
    }
  }
}

if (success) {
  console.log('\nEnvironment bootstrap completed successfully.');
} else {
  console.error('\nEnvironment bootstrap completed with errors.');
  process.exit(1);
}
