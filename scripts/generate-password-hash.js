#!/usr/bin/env node
/**
 * Generate a bcrypt password hash for use in .env / SQL seed
 * Usage: node scripts/generate-password-hash.js "YourPassword123!"
 */
const bcrypt = require('bcryptjs');

const password = process.argv[2];
if (!password) {
  console.error('Usage: node generate-password-hash.js "YourPassword123!"');
  process.exit(1);
}

bcrypt.hash(password, 12).then(hash => {
  console.log('\nPassword hash generated:');
  console.log(hash);
  console.log('\nAdd to your .env or SQL seed file.');
});
