#!/usr/bin/env node

/**
 * Custom version bumping script
 *
 * This script reads a package.json file, bumps the version based on the commit message,
 * writes it back, and outputs the new version.
 *
 * Usage:
 *   node bump-version.js <commit-message> [folder]
 *
 * Environment variables:
 *   MAJOR_WORDING - Comma-separated keywords for major bumps (default: "major,breaking")
 *   MINOR_WORDING - Comma-separated keywords for minor bumps (default: "feature,feat")
 *   PATCH_WORDING - Comma-separated keywords for patch bumps (default: "patch,fixes,fix,misc,docs,refactor")
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const commitMessage = process.argv[2];
const folder = process.argv[3] || '';

if (!commitMessage) {
    console.error('❌ Error: Commit message is required');
    console.error('Usage: node bump-version.js <commit-message> [folder]');
    process.exit(1);
}

// Get wording patterns from environment or use defaults
const majorWording = (process.env.MAJOR_WORDING || 'major,breaking').split(',').map(w => w.trim().toLowerCase());
const minorWording = (process.env.MINOR_WORDING || 'feature,feat').split(',').map(w => w.trim().toLowerCase());
const patchWording = (process.env.PATCH_WORDING || 'patch,fixes,fix,misc,docs,refactor').split(',').map(w => w.trim().toLowerCase());

// Determine bump type from commit message
function determineBumpType(message) {
    const lowerMessage = message.toLowerCase();

    for (const word of majorWording) {
        if (lowerMessage.includes(word)) {
            return 'major';
        }
    }

    for (const word of minorWording) {
        if (lowerMessage.includes(word)) {
            return 'minor';
        }
    }

    for (const word of patchWording) {
        if (lowerMessage.includes(word)) {
            return 'patch';
        }
    }

    // Default to patch if no keywords found
    return 'patch';
}

// Bump version string
function bumpVersion(version, bumpType) {
    const parts = version.split('.').map(Number);

    if (parts.length !== 3 || parts.some(isNaN)) {
        throw new Error(`Invalid version format: ${version}`);
    }

    let [major, minor, patch] = parts;

    switch (bumpType) {
        case 'major':
            major += 1;
            minor = 0;
            patch = 0;
            break;
        case 'minor':
            minor += 1;
            patch = 0;
            break;
        case 'patch':
            patch += 1;
            break;
        default:
            throw new Error(`Invalid bump type: ${bumpType}`);
    }

    return `${major}.${minor}.${patch}`;
}

// Main execution
try {
    // Determine package.json path
    const packageJsonPath = folder
        ? path.join(process.cwd(), folder, 'package.json')
        : path.join(process.cwd(), 'package.json');

    console.log(`📦 Reading package.json from: ${packageJsonPath}`);

    // Read package.json
    if (!fs.existsSync(packageJsonPath)) {
        console.error(`❌ Error: package.json not found at ${packageJsonPath}`);
        process.exit(1);
    }

    const packageJsonRaw = fs.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonRaw);
    const currentVersion = packageJson.version;

    if (!currentVersion) {
        console.error('❌ Error: No version field found in package.json');
        process.exit(1);
    }

    console.log(`📌 Current version: ${currentVersion}`);
    console.log(`💬 Commit message: ${commitMessage}`);

    // Determine bump type
    const bumpType = determineBumpType(commitMessage);
    console.log(`🔼 Bump type: ${bumpType}`);

    // Bump version
    const newVersion = bumpVersion(currentVersion, bumpType);
    console.log(`✨ New version: ${newVersion}`);

    // Update package.json while preserving existing formatting/spacing
    const escapedCurrentVersion = currentVersion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const versionPattern = new RegExp(`(^\\s*"version"\\s*:\\s*")${escapedCurrentVersion}(")`, 'm');

    if (!versionPattern.test(packageJsonRaw)) {
        console.error('❌ Error: Could not locate version field text in package.json');
        process.exit(1);
    }

    const updatedPackageJsonRaw = packageJsonRaw.replace(versionPattern, `$1${newVersion}$2`);
    fs.writeFileSync(packageJsonPath, updatedPackageJsonRaw, 'utf8');

    console.log(`✅ Successfully bumped version to ${newVersion}`);

    // Output for GitHub Actions
    console.log(`\n::set-output name=newTag::v${newVersion}`);
    console.log(`::set-output name=newVersion::${newVersion}`);

    // Also use newer GitHub Actions output format
    if (process.env.GITHUB_OUTPUT) {
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `newTag=v${newVersion}\n`);
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `newVersion=${newVersion}\n`);
    }

} catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
}
