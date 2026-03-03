#!/usr/bin/env node
// Disables GSD's context monitor PostToolUse hook from settings.json.
// Safe to run repeatedly — idempotent. Run after GSD installs/updates.

const fs = require('fs');
const path = require('path');
const os = require('os');

const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');

if (!fs.existsSync(settingsPath)) {
  process.exit(0);
}

const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

if (!settings.hooks || !settings.hooks.PostToolUse) {
  process.exit(0);
}

const before = settings.hooks.PostToolUse.length;

// Filter out any hook entries that contain gsd-context-monitor
settings.hooks.PostToolUse = settings.hooks.PostToolUse.map(entry => {
  if (!entry.hooks) return entry;
  return {
    ...entry,
    hooks: entry.hooks.filter(h => !h.command || !h.command.includes('gsd-context-monitor'))
  };
}).filter(entry => entry.hooks && entry.hooks.length > 0);

const after = settings.hooks.PostToolUse.length;

if (before !== after) {
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  console.log('AX: Disabled GSD context monitor');
} else {
  console.log('AX: Context monitor already disabled');
}
