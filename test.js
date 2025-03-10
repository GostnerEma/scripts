#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get the argument: major/minor/patch
const increment = process.argv[2];
if (!['major', 'minor', 'patch'].includes(increment)) {
  console.error('Usage: node release.js [major|minor|patch]');
  process.exit(1);
}

try {
  // 1. Checkout and update develop
  // execSync('git checkout develop', { stdio: 'inherit' });
  // execSync('git pull', { stdio: 'inherit' });

  // 2. Increment version without creating a git tag
  

  // 3. Read the new version from package.json
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const newVersion = packageJson.version;

  // 4. Create a release branch
 
  execSync(`git checkout -b release/${newVersion}`, { stdio: 'inherit' });

} catch (error) {
  console.error('An error occurred during the release process:', error);
  process.exit(1);
}
