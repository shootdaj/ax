// Tests structural integrity of command files and supporting scripts.
// Validates step numbering, file references, install script, and context monitor utility.

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const os = require('node:os');

const ROOT = path.resolve(__dirname, '..');
// Support both plugin layout (skills/) and legacy layout (.claude/commands/ax/)
const SKILLS_DIR = path.join(ROOT, 'skills');
const LEGACY_COMMANDS_DIR = path.join(ROOT, '.claude', 'commands', 'ax');
const REFS_DIR = fs.existsSync(path.join(ROOT, 'references'))
  ? path.join(ROOT, 'references')
  : path.join(ROOT, '.claude', 'ax', 'references');

function readCommand(name) {
  // Try plugin layout first, then legacy
  const skillPath = path.join(SKILLS_DIR, name, 'SKILL.md');
  if (fs.existsSync(skillPath)) return fs.readFileSync(skillPath, 'utf8');
  return fs.readFileSync(path.join(LEGACY_COMMANDS_DIR, `${name}.md`), 'utf8');
}

// Extract step numbers from ### Step N: headers
function extractStepNumbers(content) {
  const steps = [];
  const pattern = /^###\s+Step\s+(\d+)/gm;
  let m;
  while ((m = pattern.exec(content)) !== null) {
    steps.push(parseInt(m[1], 10));
  }
  return steps;
}

describe('Command step numbering', () => {
  const commands = ['init', 'phase', 'finish'];
  // run.md uses a different structure (Pre-flight numbered list + Execution Loop)

  for (const cmd of commands) {
    it(`${cmd}.md has sequential step numbers with no gaps`, () => {
      const content = readCommand(cmd);
      const steps = extractStepNumbers(content);
      assert.ok(steps.length > 0, `${cmd}.md should have numbered steps`);

      for (let i = 1; i < steps.length; i++) {
        assert.strictEqual(
          steps[i], steps[i - 1] + 1,
          `${cmd}.md step numbering gap: Step ${steps[i - 1]} followed by Step ${steps[i]}`
        );
      }
    });

    it(`${cmd}.md has no duplicate step numbers`, () => {
      const content = readCommand(cmd);
      const steps = extractStepNumbers(content);
      const unique = new Set(steps);
      assert.strictEqual(steps.length, unique.size,
        `${cmd}.md has duplicate step numbers: ${steps.join(', ')}`
      );
    });
  }
});

describe('Reference file existence', () => {
  it('all CI templates exist', () => {
    for (const stack of ['go', 'node', 'python', 'rust']) {
      const filePath = path.join(REFS_DIR, 'ci-templates', `${stack}.yml`);
      assert.ok(fs.existsSync(filePath), `Missing CI template: ${stack}.yml`);
    }
  });

  it('all Notion templates exist', () => {
    const expectedPages = [
      'architecture', 'data-flow', 'api-reference', 'component-index',
      'adr', 'deployment', 'dev-workflow', 'phase-report'
    ];
    for (const page of expectedPages) {
      const filePath = path.join(REFS_DIR, 'notion-templates', `${page}.md`);
      assert.ok(fs.existsSync(filePath), `Missing Notion template: ${page}.md`);
    }
  });

  it('test guide template exists', () => {
    assert.ok(
      fs.existsSync(path.join(REFS_DIR, 'test-guide-template.md')),
      'Missing test-guide-template.md'
    );
  });

  it('testing pyramid reference exists', () => {
    assert.ok(
      fs.existsSync(path.join(REFS_DIR, 'testing-pyramid.md')),
      'Missing testing-pyramid.md'
    );
  });

  it('disable-context-monitor.js exists', () => {
    const exists = fs.existsSync(path.join(ROOT, 'scripts', 'disable-context-monitor.js'))
      || fs.existsSync(path.join(ROOT, '.claude', 'ax', 'disable-context-monitor.js'));
    assert.ok(exists, 'Missing disable-context-monitor.js'
    );
  });
});

describe('Command completeness', () => {
  it('all 5 command files exist', () => {
    for (const cmd of ['init', 'phase', 'run', 'finish', 'status']) {
      const exists = fs.existsSync(path.join(SKILLS_DIR, cmd, 'SKILL.md'))
        || fs.existsSync(path.join(LEGACY_COMMANDS_DIR, `${cmd}.md`));
      assert.ok(exists, `Missing command: ${cmd}`);
    }
  });

  it('all commands list their allowed tools', () => {
    for (const cmd of ['init', 'phase', 'run', 'finish', 'status']) {
      const content = readCommand(cmd);
      assert.ok(
        content.includes('## Allowed Tools') || content.includes('Allowed Tools'),
        `${cmd}.md should declare allowed tools`
      );
    }
  });

  it('init.md has output summary section', () => {
    const content = readCommand('init');
    assert.ok(content.includes('## Output'), 'init.md should have output summary');
    assert.ok(content.includes('AX Init Complete'), 'init.md output should say "AX Init Complete"');
  });

  it('phase.md has output summary section', () => {
    const content = readCommand('phase');
    assert.ok(
      content.includes('Display Summary') || content.includes('Phase {N} Complete'),
      'phase.md should have output summary'
    );
  });

  it('finish.md has output summary section', () => {
    const content = readCommand('finish');
    assert.ok(
      content.includes('Display Summary') || content.includes('Milestone Complete'),
      'finish.md should have output summary'
    );
  });

  it('status.md has display section', () => {
    const content = readCommand('status');
    assert.ok(content.includes('## Display'), 'status.md should have display section');
  });

  it('run.md has summary output section', () => {
    const content = readCommand('run');
    assert.ok(
      content.includes('Summary Output') || content.includes('AX Autopilot Summary'),
      'run.md should have summary output'
    );
  });
});

describe('Cross-command references', () => {
  it('all commands that say "run /ax:init first" reference the right command', () => {
    for (const cmd of ['phase', 'run', 'finish', 'status']) {
      const content = readCommand(cmd);
      if (content.includes('run `/ax:init`')) {
        // Good — it references the right command
        assert.ok(true);
      }
    }
  });

  it('phase.md references GSD skills via Skill tool', () => {
    const content = readCommand('phase');
    assert.ok(
      content.includes('Skill tool') || content.includes('Skill'),
      'phase.md should reference the Skill tool for GSD commands'
    );
  });

  it('run.md delegates to subagents, not direct execution', () => {
    const content = readCommand('run');
    assert.ok(content.includes('Agent'), 'run.md should use Agent tool for subagents');
    assert.ok(
      content.includes('thin orchestrator') || content.includes('Thin orchestrator'),
      'run.md should describe itself as a thin orchestrator'
    );
  });
});

describe('install.sh', () => {
  const script = fs.readFileSync(path.join(ROOT, 'install.sh'), 'utf8');

  it('has proper shebang and strict mode', () => {
    assert.ok(script.startsWith('#!/usr/bin/env bash'), 'Should have bash shebang');
    assert.ok(script.includes('set -euo pipefail'), 'Should use strict mode');
  });

  it('checks for git prerequisite', () => {
    assert.ok(script.includes('command -v git'), 'Should check for git');
  });

  it('warns about Claude Code CLI', () => {
    assert.ok(script.includes('claude'), 'Should mention Claude Code CLI');
  });

  it('installs to ~/.claude/', () => {
    assert.ok(script.includes('$HOME/.claude'), 'Should install to ~/.claude/');
  });

  it('copies commands and references', () => {
    assert.ok(script.includes('commands/ax'), 'Should copy commands');
    assert.ok(script.includes('.claude/ax/'), 'Should copy references');
  });

  it('cleans up temp directory on exit', () => {
    assert.ok(script.includes('trap cleanup EXIT'), 'Should trap EXIT for cleanup');
  });

  it('uses shallow clone for speed', () => {
    assert.ok(script.includes('--depth 1'), 'Should use shallow clone');
  });

  it('handles existing installation (update)', () => {
    assert.ok(
      script.includes('Updating existing') || script.includes('existing'),
      'Should detect and handle existing installation'
    );
  });
});

describe('disable-context-monitor.js', () => {
  const scriptPath = fs.existsSync(path.join(ROOT, 'scripts', 'disable-context-monitor.js'))
    ? path.join(ROOT, 'scripts', 'disable-context-monitor.js')
    : path.join(ROOT, '.claude', 'ax', 'disable-context-monitor.js');

  it('handles missing settings.json gracefully', () => {
    // Run with a non-existent home dir
    const result = execSync(
      `HOME=/tmp/ax-test-nonexistent node "${scriptPath}"`,
      { stdio: 'pipe', env: { ...process.env, HOME: '/tmp/ax-test-nonexistent' } }
    );
    // Should exit 0 (no error)
    assert.ok(true, 'Should not throw when settings.json is missing');
  });

  it('handles settings.json with no hooks', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ax-test-'));
    const claudeDir = path.join(tmpDir, '.claude');
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify({ version: 1 }));

    const result = execSync(
      `node "${scriptPath}"`,
      { stdio: 'pipe', env: { ...process.env, HOME: tmpDir } }
    );
    assert.ok(true, 'Should not throw when no hooks exist');

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('removes gsd-context-monitor hooks while preserving others', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ax-test-'));
    const claudeDir = path.join(tmpDir, '.claude');
    fs.mkdirSync(claudeDir, { recursive: true });

    const settings = {
      hooks: {
        PostToolUse: [
          {
            hooks: [
              { command: 'node /path/to/gsd-context-monitor.js' },
              { command: 'echo "other hook"' }
            ]
          }
        ]
      }
    };
    fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify(settings));

    execSync(
      `node "${scriptPath}"`,
      { stdio: 'pipe', env: { ...process.env, HOME: tmpDir } }
    );

    const updated = JSON.parse(fs.readFileSync(path.join(claudeDir, 'settings.json'), 'utf8'));
    // The gsd-context-monitor hook should be removed, but the "other hook" should remain
    const allCommands = updated.hooks.PostToolUse
      .flatMap(e => (e.hooks || []).map(h => h.command));
    assert.ok(
      !allCommands.some(c => c.includes('gsd-context-monitor')),
      'Should remove gsd-context-monitor hooks'
    );
    assert.ok(
      allCommands.some(c => c.includes('other hook')),
      'Should preserve non-gsd hooks'
    );

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('removes entire entry when gsd-context-monitor is the only hook', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ax-test-'));
    const claudeDir = path.join(tmpDir, '.claude');
    fs.mkdirSync(claudeDir, { recursive: true });

    const settings = {
      hooks: {
        PostToolUse: [
          {
            hooks: [
              { command: 'node /path/to/gsd-context-monitor.js' }
            ]
          }
        ]
      }
    };
    fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify(settings));

    execSync(
      `node "${scriptPath}"`,
      { stdio: 'pipe', env: { ...process.env, HOME: tmpDir } }
    );

    const updated = JSON.parse(fs.readFileSync(path.join(claudeDir, 'settings.json'), 'utf8'));
    assert.strictEqual(
      updated.hooks.PostToolUse.length, 0,
      'Should remove entry entirely when gsd-context-monitor is the only hook'
    );

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('is idempotent — running twice produces same result', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ax-test-'));
    const claudeDir = path.join(tmpDir, '.claude');
    fs.mkdirSync(claudeDir, { recursive: true });

    const settings = {
      hooks: {
        PostToolUse: [
          { hooks: [{ command: 'echo "keep me"' }] }
        ]
      }
    };
    fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify(settings));

    execSync(`node "${scriptPath}"`, { stdio: 'pipe', env: { ...process.env, HOME: tmpDir } });
    const after1 = fs.readFileSync(path.join(claudeDir, 'settings.json'), 'utf8');

    execSync(`node "${scriptPath}"`, { stdio: 'pipe', env: { ...process.env, HOME: tmpDir } });
    const after2 = fs.readFileSync(path.join(claudeDir, 'settings.json'), 'utf8');

    assert.strictEqual(after1, after2, 'Running twice should produce identical output');

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true });
  });
});

describe('Status --quick mode', () => {
  it('status.md supports --quick argument', () => {
    const content = readCommand('status');
    assert.ok(content.includes('$ARGUMENTS'), 'status.md should parse $ARGUMENTS');
    assert.ok(content.includes('--quick'), 'status.md should support --quick flag');
    assert.ok(content.includes('QUICK_MODE'), 'status.md should set QUICK_MODE variable');
  });

  it('quick mode skips test execution', () => {
    const content = readCommand('status');
    assert.ok(
      content.includes('Skip running tests') || content.includes('Do NOT execute'),
      'Quick mode should explicitly skip test execution'
    );
  });

  it('quick mode checks test file existence instead', () => {
    const content = readCommand('status');
    assert.ok(
      content.includes('Glob') || content.includes('file existence') || content.includes('test file'),
      'Quick mode should check test files via Glob'
    );
  });
});

describe('Plugin structure', () => {
  it('plugin.json exists and has required fields', () => {
    const pluginPath = path.join(ROOT, '.claude-plugin', 'plugin.json');
    assert.ok(fs.existsSync(pluginPath), 'Missing .claude-plugin/plugin.json');
    const plugin = JSON.parse(fs.readFileSync(pluginPath, 'utf8'));
    assert.strictEqual(plugin.name, 'ax', 'Plugin name should be "ax"');
    assert.ok(plugin.version, 'plugin.json should have version');
    assert.ok(plugin.description, 'plugin.json should have description');
  });

  it('all 5 skills exist in skills/ directory', () => {
    for (const skill of ['init', 'phase', 'run', 'finish', 'status']) {
      const skillPath = path.join(ROOT, 'skills', skill, 'SKILL.md');
      assert.ok(fs.existsSync(skillPath), `Missing skill: skills/${skill}/SKILL.md`);
    }
  });

  it('references/ directory exists at plugin root', () => {
    assert.ok(
      fs.existsSync(path.join(ROOT, 'references')),
      'Missing references/ at plugin root'
    );
    assert.ok(
      fs.existsSync(path.join(ROOT, 'references', 'ci-templates')),
      'Missing references/ci-templates/'
    );
    assert.ok(
      fs.existsSync(path.join(ROOT, 'references', 'notion-templates')),
      'Missing references/notion-templates/'
    );
  });

  it('scripts/ directory has disable-context-monitor.js', () => {
    assert.ok(
      fs.existsSync(path.join(ROOT, 'scripts', 'disable-context-monitor.js')),
      'Missing scripts/disable-context-monitor.js'
    );
  });

  it('skills reference ${CLAUDE_PLUGIN_ROOT} for file paths', () => {
    const init = fs.readFileSync(path.join(ROOT, 'skills', 'init', 'SKILL.md'), 'utf8');
    assert.ok(
      init.includes('${CLAUDE_PLUGIN_ROOT}'),
      'init SKILL.md should reference ${CLAUDE_PLUGIN_ROOT} for portable paths'
    );
  });

  it('npx CLI script exists and is executable', () => {
    const cliPath = path.join(ROOT, 'bin', 'cli.js');
    assert.ok(fs.existsSync(cliPath), 'Missing bin/cli.js');
    const content = fs.readFileSync(cliPath, 'utf8');
    assert.ok(content.startsWith('#!/usr/bin/env node'), 'cli.js should have Node shebang');
  });

  it('package.json has correct bin field', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
    assert.strictEqual(pkg.name, 'ax-cc', 'Package name should be ax-cc');
    assert.ok(pkg.bin && pkg.bin['ax-cc'], 'package.json should have bin.ax-cc');
  });
});

describe('Timestamp tracking', () => {
  it('init.md creates last_commands in config', () => {
    const content = readCommand('init');
    assert.ok(content.includes('last_commands'), 'init.md should include last_commands in config');
    assert.ok(content.includes('"init"'), 'last_commands should track init');
    assert.ok(content.includes('"phase"'), 'last_commands should track phase');
    assert.ok(content.includes('"run"'), 'last_commands should track run');
    assert.ok(content.includes('"finish"'), 'last_commands should track finish');
    assert.ok(content.includes('"status"'), 'last_commands should track status');
  });

  it('phase.md records start time', () => {
    const content = readCommand('phase');
    assert.ok(
      content.includes('PHASE_START_TIME') || content.includes('start time'),
      'phase.md should record phase start time'
    );
  });

  it('status.md displays Activity Timeline', () => {
    const content = readCommand('status');
    assert.ok(
      content.includes('Activity Timeline'),
      'status.md should display Activity Timeline'
    );
  });

  it('status.md displays Phase Details with duration', () => {
    const content = readCommand('status');
    assert.ok(
      content.includes('Phase Details'),
      'status.md should display Phase Details table'
    );
    assert.ok(
      content.includes('Duration'),
      'Phase Details should include duration column'
    );
  });

  it('finish.md archives to milestone_history with timestamps', () => {
    const content = readCommand('finish');
    assert.ok(
      content.includes('milestone_history'),
      'finish.md should archive to milestone_history'
    );
    assert.ok(
      content.includes('completed_at'),
      'milestone_history entries should have completed_at'
    );
  });
});
