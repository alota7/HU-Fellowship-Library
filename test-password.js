const crypto = require('crypto');

function hashPassword(password) {
  return crypto.scryptSync(password, "hu-fellowship-admin-2026", 64).toString("hex");
}

const storedHash = "fb5b6b868171db4f262e1f46bb0fc6aa2a2384ed07f7dfd1a266e20d35ccecb5c559d6c6c13dbac90f65d3af6a4af65178b5f87e383f606704850f5a81f8ca18";

// Test common passwords
const testPasswords = ['admin', 'password', 'hu-fellowship', 'admin123', 'library', 'fellowship', 'HU2024', 'admin@hu'];

for (const pwd of testPasswords) {
  const hash = hashPassword(pwd);
  if (hash === storedHash) {
    console.log(`Found! Password is: ${pwd}`);
    break;
  }
}
