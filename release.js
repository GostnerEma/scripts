#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function ask(msg) {
  process.stdout.write(`${msg} proceed? (y/n) `);
  const buf = Buffer.alloc(1);
  while (true) {
    const bytesRead = fs.readSync(0, buf, 0, 1, null);
    if (!bytesRead) {
      // Interprets no input as yes
      break;
    }
    const char = buf.toString().toLowerCase();
    if (char === 'y' || char === '\n') {
      break;
    }
    if (char === 'n') {
      console.log('Operation cancelled by user');
      process.exit(1);
    }
  }
}

// Get the argument: major/minor/patch
const increment = process.argv[2];
if (!['major', 'minor', 'patch'].includes(increment)) {
  console.error('Usage: node release.js [major|minor|patch]');
  process.exit(1);
}

const packageJsonPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('package.json not found');
  process.exit(1);
}
try {
  execSync('git rev-parse --verify main', { stdio: 'ignore' });
} catch {
  console.error('Branch "main" does not exist');
  process.exit(1);
}
try {
  execSync('git rev-parse --verify develop', { stdio: 'ignore' });
} catch {
  console.error('Branch "develop" does not exist');
  process.exit(1);
}

try {
  ask('Reading current version');
  // Read current version from package.json
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const currentVersion = packageJson.version;
  console.log(`Current version: ${currentVersion}`);

  ask('Bumping version');
  // Bump the version without creating a commit or tag yet
  execSync(`npm version ${increment} --no-git-tag-version`, { stdio: 'inherit' });
  console.log(`Bumped to ${increment}`);
  
  ask('Reading updated version');
  // After bumping, read the updated version
  const updatedPackageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const newVersion = updatedPackageJson.version;
  console.log(`New version: ${newVersion}`);
  
  ask('Creating release branch');
  const existingBranch = execSync(`git branch --list release/${newVersion}`).toString().trim();
  if (existingBranch) {
    console.log(`Branch release/${newVersion} already exists.`);
    ask('Should we delete it?');
    execSync(`git branch -D release/${newVersion}`, { stdio: 'inherit' });
  }
  execSync(`git checkout -b release/${newVersion}`, { stdio: 'inherit' });

  ask('Running changelogen');
  // Run changelogen with the correct flag
  const changelogenFlag = `--${increment}`;
  execSync(`npx changelogen --output ${changelogenFlag}`, { stdio: 'inherit' });
console.log('changelog generated');

  ask('Committing changes');
  // Commit the changes
  execSync('git add .', { stdio: 'inherit' });
  execSync(`git commit -m "chore: v${newVersion}"`, { stdio: 'inherit' });

  ask('Merging release branch into develop');
  // Merge release branch into develop
  execSync(`git checkout develop`, { stdio: 'inherit' });
  execSync(`git merge --no-ff release/${newVersion} -m "chore: merge release ${newVersion} into develop"`, { stdio: 'inherit' });

  ask('Merging release branch into main');
  // Merge release branch into main
  execSync(`git checkout main`, { stdio: 'inherit' });
  execSync(`git merge --no-ff release/${newVersion} -m "chore: merge release ${newVersion} into main"`, { stdio: 'inherit' });
  execSync(`git tag -a v${newVersion} -m "Release ${newVersion}"`, { stdio: 'inherit' });

  ask('Pushing main');
  // Push main
  execSync(`git checkout main`, { stdio: 'inherit' });
  execSync(`git push --set-upstream origin main --tags`, { stdio: 'inherit' });

  ask('Pushing develop');
  // Push develop
  execSync(`git checkout develop`, { stdio: 'inherit' });
  execSync(`git push --set-upstream origin develop`, { stdio: 'inherit' });

  // ask('Pushing release branch');
  // // Push release branch
  // execSync(`git checkout release/${newVersion}`, { stdio: 'inherit' });
  // execSync(`git push --set-upstream origin release/${newVersion}`, { stdio: 'inherit' });

  // Optionally delete the release branch locally if you like:
  // execSync(`git branch -d release/${newVersion}`, { stdio: 'inherit' });

  console.log(`Release ${newVersion} completed successfully!`);
} catch (error) {
  console.error('An error occurred during the release process:', error);
  process.exit(1);
}
