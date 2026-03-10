#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const readline = require('readline');

const PLUGIN_NAME = 'ax';
const PKG_ROOT = path.resolve(__dirname, '..');

// ── Helpers ──────────────────────────────────────────────────

function log(msg) { console.log(msg); }
function err(msg) { console.error(`Error: ${msg}`); process.exit(1); }

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function rmDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ── Argument parsing ─────────────────────────────────────────

const args = process.argv.slice(2);
const flags = new Set(args.map(a => a.toLowerCase()));

if (flags.has('-h') || flags.has('--help') || flags.has('help')) {
  log(`
AX — Full project lifecycle for Claude Code

Usage:
  npx github:shootdaj/ax [options]

Options:
  --global, -g              Install to ~/.claude/ (available in all projects)
  --local, -l               Install to ./.claude/ (current project only)
  --notion-page <id>        Set Notion parent page non-interactively (optional)
  --uninstall, -u           Remove AX
  --help, -h                Show this help

During install, AX will ask for a Notion parent page ID. All projects
created with /ax:init will nest their docs under this page. Press Enter
to skip if you don't use Notion.

Examples:
  npx github:shootdaj/ax --global                          Install globally (asks for Notion page)
  npx github:shootdaj/ax --global --notion-page abc123...  Install with Notion page (non-interactive)
  npx github:shootdaj/ax --local                           Install in current project
  npx github:shootdaj/ax -g -u                             Uninstall global installation
  npx github:shootdaj/ax@main --global                     Update to latest version

After install, open Claude Code and run /ax:init
`);
  process.exit(0);
}

const isGlobal = flags.has('--global') || flags.has('-g');
const isLocal = flags.has('--local') || flags.has('-l');
const isUninstall = flags.has('--uninstall') || flags.has('-u');

// Extract --notion-page value (not a boolean flag)
let notionPageId = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--notion-page' && args[i + 1]) {
    notionPageId = args[i + 1];
    break;
  }
}

if (!isGlobal && !isLocal) {
  // Default to global if no scope specified — prompt-free like GSD
  log('No scope specified, defaulting to --global');
}

const scope = isLocal ? 'local' : 'global';
const baseDir = scope === 'global'
  ? path.join(process.env.HOME, '.claude')
  : path.join(process.cwd(), '.claude');

// ── Uninstall ────────────────────────────────────────────────

if (isUninstall) {
  log(`Uninstalling AX (${scope})...`);

  // Remove legacy paths
  rmDir(path.join(baseDir, 'commands', 'ax'));
  rmDir(path.join(baseDir, 'ax'));

  // Remove plugin format paths
  rmDir(path.join(baseDir, 'plugins', 'cache', PLUGIN_NAME));

  log('AX uninstalled.');
  process.exit(0);
}

// ── Install ──────────────────────────────────────────────────

async function install() {
  log(`Installing AX (${scope})...`);

  // Check for GSD
  const gsdDir = path.join(process.env.HOME, '.claude', 'commands', 'gsd');
  if (!fs.existsSync(gsdDir)) {
    log('');
    log('Warning: GSD not found. AX requires GSD for planning and execution.');
    log('Install it: npx get-shit-done-cc --claude --global');
    log('');
  }

  // Install as legacy format (commands/ + ax/) for maximum compatibility
  // The plugin format works only with Claude Code v1.0.33+, so we install
  // in the format that works with all versions.

  const commandsDir = path.join(baseDir, 'commands', 'ax');
  const refsDir = path.join(baseDir, 'ax');

  // Check for existing install
  if (fs.existsSync(commandsDir) && fs.readdirSync(commandsDir).length > 0) {
    log('Updating existing AX installation...');
  }

  // Copy skills → commands (convert SKILL.md → command.md)
  fs.mkdirSync(commandsDir, { recursive: true });
  const skillsDir = path.join(PKG_ROOT, 'skills');
  if (fs.existsSync(skillsDir)) {
    for (const skill of fs.readdirSync(skillsDir)) {
      const skillFile = path.join(skillsDir, skill, 'SKILL.md');
      if (fs.existsSync(skillFile)) {
        fs.copyFileSync(skillFile, path.join(commandsDir, `${skill}.md`));
      }
    }
  }

  // Copy references
  fs.mkdirSync(path.join(refsDir, 'references'), { recursive: true });
  copyDir(path.join(PKG_ROOT, 'references'), path.join(refsDir, 'references'));

  // Copy scripts
  const scriptsDir = path.join(PKG_ROOT, 'scripts');
  if (fs.existsSync(scriptsDir)) {
    for (const file of fs.readdirSync(scriptsDir)) {
      fs.copyFileSync(
        path.join(scriptsDir, file),
        path.join(refsDir, file)
      );
    }
  }

  // Write version marker
  const pkg = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'package.json'), 'utf8'));
  fs.writeFileSync(path.join(refsDir, 'VERSION'), pkg.version + '\n');

  // ── Notion setup ────────────────────────────────────────────
  // Check for existing global config
  const globalConfigPath = path.join(process.env.HOME, '.claude', 'ax', 'global.json');
  let globalConfig = {};
  if (fs.existsSync(globalConfigPath)) {
    try { globalConfig = JSON.parse(fs.readFileSync(globalConfigPath, 'utf8')); } catch {}
  }

  const existingNotionPage = globalConfig.notion?.parent_page_id;

  if (notionPageId) {
    // Provided via --notion-page flag
    globalConfig.notion = globalConfig.notion || {};
    globalConfig.notion.parent_page_id = notionPageId;
  } else if (!existingNotionPage) {
    // No existing config — ask interactively
    log('');
    log('Notion Integration (optional)');
    log('All project docs can be created under a single Notion parent page.');
    log('Find the page ID in the URL: notion.so/My-Page-<page-id>');
    log('');
    const answer = await ask('Notion parent page ID (Enter to skip): ');
    if (answer) {
      globalConfig.notion = globalConfig.notion || {};
      globalConfig.notion.parent_page_id = answer;
      notionPageId = answer;
    }
  } else {
    log(`  Notion:     Using existing parent page ${existingNotionPage}`);
  }

  // Save global config if we have Notion settings
  if (notionPageId || existingNotionPage) {
    fs.mkdirSync(path.dirname(globalConfigPath), { recursive: true });
    fs.writeFileSync(globalConfigPath, JSON.stringify(globalConfig, null, 2) + '\n');
    if (notionPageId) {
      log(`  Notion:     Parent page saved to global config`);
    }
  }

  log('');
  log('AX installed successfully!');
  log('');
  log(`  Commands:   ${commandsDir}/`);
  log(`  References: ${refsDir}/`);
  log(`  Version:    ${pkg.version}`);
  if (globalConfig.notion?.parent_page_id) {
    log(`  Notion:     ${globalConfig.notion.parent_page_id}`);
  }
  log('');
  log('Usage: Open Claude Code in any project and run /ax:init');
  if (scope === 'local') {
    log('Note: This is a project-local install. Add .claude/ to .gitignore or commit it for team sharing.');
  }
}

install();
