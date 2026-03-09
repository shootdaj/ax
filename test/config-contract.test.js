// Tests that config fields referenced in commands match the schema defined in init.md.
// Catches schema drift — when a command references config.X.Y but init doesn't create that field.

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(ROOT, 'skills');
const LEGACY_COMMANDS_DIR = path.join(ROOT, '.claude', 'commands', 'ax');

function readCommand(name) {
  const skillPath = path.join(SKILLS_DIR, name, 'SKILL.md');
  if (fs.existsSync(skillPath)) return fs.readFileSync(skillPath, 'utf8');
  return fs.readFileSync(path.join(LEGACY_COMMANDS_DIR, `${name}.md`), 'utf8');
}

// Extract the config JSON schema from init.md's Step 10 code block
function extractConfigSchema() {
  const init = readCommand('init');
  // Find the JSON block after "Write AX Config" / "config.json"
  const match = init.match(/config\.json[\s\S]*?```json\n([\s\S]*?)```/);
  assert.ok(match, 'init.md should contain config.json schema in a JSON code block');
  // The JSON has placeholder values — normalize them to make it parseable
  let json = match[1]
    // First handle the already-quoted values that contain "or null"
    .replace(/"docker-compose\.test\.yml or null"/g, '"placeholder"')
    // Then handle "<...>" placeholders (already inside quotes)
    .replace(/"<[^"]*>"/g, '"placeholder"')
    // Handle any bare <...> not inside quotes
    .replace(/<[^>]+>/g, '"placeholder"');
  return JSON.parse(json);
}

// Extract all config.X.Y references from a markdown file
function extractConfigRefs(content) {
  const refs = new Set();
  // Match config.X.Y patterns (dotted paths) but not file paths like config.json
  const pattern = /config\.(\w+(?:\.\w+)*)/g;
  let m;
  while ((m = pattern.exec(content)) !== null) {
    const ref = m[1];
    // Skip file extensions (config.json, config.yml) — these are file paths, not field refs
    if (ref === 'json' || ref === 'yml' || ref === 'yaml' || ref === 'js') continue;
    refs.add(ref);
  }
  return refs;
}

// Check if a dotted path exists in an object
function pathExists(obj, dotPath) {
  const parts = dotPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return false;
    }
    if (!(part in current)) {
      return false;
    }
    current = current[part];
  }
  return true;
}

describe('Config schema contract', () => {
  const schema = extractConfigSchema();

  it('init.md produces a valid config with all top-level keys', () => {
    const requiredKeys = [
      'initialized_at', 'project_name', 'mode', 'profile',
      'notion', 'testing', 'deployment', 'ci', 'phases_completed', 'milestone_history', 'last_commands'
    ];
    for (const key of requiredKeys) {
      assert.ok(key in schema, `Config schema missing top-level key: ${key}`);
    }
  });

  it('testing section has all required fields', () => {
    const requiredFields = [
      'stack', 'language_version', 'test_framework',
      'unit_command', 'integration_command', 'scenario_command', 'docker_compose_file'
    ];
    for (const field of requiredFields) {
      assert.ok(field in schema.testing, `Config schema.testing missing: ${field}`);
    }
  });

  it('notion section has required structure', () => {
    assert.ok('parent_page_id' in schema.notion, 'notion missing parent_page_id');
    assert.ok('doc_pages' in schema.notion, 'notion missing doc_pages');
    assert.ok('last_updated' in schema.notion, 'notion missing last_updated');
    const expectedPages = [
      'architecture', 'data_flow', 'api_reference', 'component_index',
      'adrs', 'deployment', 'dev_workflow', 'phase_reports'
    ];
    for (const page of expectedPages) {
      assert.ok(page in schema.notion.doc_pages, `notion.doc_pages missing: ${page}`);
    }
  });

  it('last_commands tracks all 5 commands', () => {
    const commands = ['init', 'phase', 'run', 'finish', 'status'];
    for (const cmd of commands) {
      assert.ok(cmd in schema.last_commands, `last_commands missing: ${cmd}`);
    }
  });

  it('phases_completed is an array', () => {
    assert.ok(Array.isArray(schema.phases_completed), 'phases_completed should be an array');
  });

  it('milestone_history is an array', () => {
    assert.ok(Array.isArray(schema.milestone_history), 'milestone_history should be an array');
  });

  for (const cmd of ['phase', 'run', 'finish', 'status']) {
    it(`${cmd}.md only references config fields that exist in schema`, () => {
      const content = readCommand(cmd);
      const refs = extractConfigRefs(content);
      for (const ref of refs) {
        // config.testing.docker_compose_file → testing.docker_compose_file
        assert.ok(
          pathExists(schema, ref),
          `${cmd}.md references config.${ref} but init.md schema doesn't define it`
        );
      }
    });
  }
});

describe('Config validation consistency', () => {
  // All commands that validate config should check the same required fields
  const validatingCommands = ['phase', 'run', 'finish', 'status'];

  it('all commands validate testing.unit_command', () => {
    for (const cmd of validatingCommands) {
      const content = readCommand(cmd);
      assert.ok(
        content.includes('testing.unit_command'),
        `${cmd}.md should validate testing.unit_command`
      );
    }
  });

  it('all commands validate testing.stack', () => {
    for (const cmd of validatingCommands) {
      const content = readCommand(cmd);
      assert.ok(
        content.includes('testing.stack'),
        `${cmd}.md should validate testing.stack`
      );
    }
  });

  it('all commands validate phases_completed', () => {
    for (const cmd of validatingCommands) {
      const content = readCommand(cmd);
      assert.ok(
        content.includes('phases_completed'),
        `${cmd}.md should validate phases_completed`
      );
    }
  });

  it('phase and finish validate notion fields when configured', () => {
    for (const cmd of ['phase', 'finish']) {
      const content = readCommand(cmd);
      assert.ok(
        content.includes('notion.doc_pages'),
        `${cmd}.md should validate notion.doc_pages when Notion is configured`
      );
    }
  });
});

describe('Deployment config', () => {
  const schema = extractConfigSchema();

  it('deployment section has required fields', () => {
    assert.ok('type' in schema.deployment, 'deployment missing type');
    assert.ok('provider' in schema.deployment, 'deployment missing provider');
    assert.ok('url' in schema.deployment, 'deployment missing url');
  });

  it('init.md has deployment detection step', () => {
    const init = readCommand('init');
    assert.ok(
      init.includes('Configure Deployment') || init.includes('Detect Deployment'),
      'init.md should have a deployment configuration step'
    );
  });

  it('init.md maps web apps to vercel', () => {
    const init = readCommand('init');
    assert.ok(
      init.includes('vercel') && init.includes('web-app'),
      'init.md should map web apps to Vercel'
    );
  });

  it('finish.md has a deploy step', () => {
    const finish = readCommand('finish');
    assert.ok(
      finish.includes('### Step 6: Deploy'),
      'finish.md should have a deploy step'
    );
  });

  it('finish.md handles all deployment providers', () => {
    const finish = readCommand('finish');
    const providers = ['vercel', 'npm', 'pypi', 'crates', 'go-module', 'github-releases', 'docker'];
    for (const provider of providers) {
      assert.ok(
        finish.includes(provider),
        `finish.md should handle ${provider} deployment`
      );
    }
  });

  it('finish.md stores deployment URL in config', () => {
    const finish = readCommand('finish');
    assert.ok(
      finish.includes('config.deployment.url'),
      'finish.md should store deployment URL in config'
    );
  });

  it('finish.md records deployment in milestone history', () => {
    const finish = readCommand('finish');
    assert.ok(
      finish.includes('"deployment"') && finish.includes('"provider"') && finish.includes('"url"'),
      'finish.md milestone history should include deployment info'
    );
  });

  it('finish.md skips deployment when provider is none', () => {
    const finish = readCommand('finish');
    assert.ok(
      finish.includes('"none"'),
      'finish.md should handle provider "none" (skip deployment)'
    );
  });
});

describe('phases_completed format consistency', () => {
  it('phase.md writes phases_completed as objects with timestamps', () => {
    const content = readCommand('phase');
    assert.ok(
      content.includes('started_at') && content.includes('completed_at'),
      'phase.md should write started_at and completed_at to phases_completed entries'
    );
    assert.ok(
      content.includes('"title"'),
      'phase.md should write title to phases_completed entries'
    );
  });

  it('run.md reads phases_completed as objects with .phase field', () => {
    const content = readCommand('run');
    assert.ok(
      content.includes('.phase'),
      'run.md should reference .phase field when reading phases_completed'
    );
  });

  it('status.md displays phase timestamps', () => {
    const content = readCommand('status');
    assert.ok(
      content.includes('started_at') || content.includes('Started'),
      'status.md should display phase start times'
    );
    assert.ok(
      content.includes('completed_at') || content.includes('Completed'),
      'status.md should display phase completion times'
    );
    assert.ok(
      content.includes('Duration') || content.includes('duration'),
      'status.md should display phase durations'
    );
  });
});
