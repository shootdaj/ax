// Tests that CI templates produce valid YAML after placeholder substitution.
// Validates both with-services and without-services variants.

const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
// Support both plugin layout and legacy layout
const TEMPLATES_DIR = fs.existsSync(path.join(ROOT, 'references', 'ci-templates'))
  ? path.join(ROOT, 'references', 'ci-templates')
  : path.join(ROOT, '.claude', 'ax', 'references', 'ci-templates');

const TEMPLATES = {
  node: {
    file: 'node.yml',
    placeholders: {
      '{{NODE_VERSION}}': '20',
      '{{PACKAGE_MANAGER}}': 'npm',
      '{{INSTALL_COMMAND}}': 'npm ci',
      '{{LINT_COMMAND}}': 'npm run lint',
      '{{UNIT_COMMAND}}': 'npx vitest run --dir src',
      '{{INTEGRATION_COMMAND}}': 'npx vitest run --dir test/integration',
      '{{SCENARIO_COMMAND}}': 'npx vitest run --dir test/scenarios',
    },
  },
  go: {
    file: 'go.yml',
    placeholders: {
      '{{GO_VERSION}}': '1.22',
    },
  },
  python: {
    file: 'python.yml',
    placeholders: {
      '{{PYTHON_VERSION}}': '3.12',
      '{{INSTALL_COMMAND}}': 'pip install -r requirements.txt',
      '{{LINT_COMMAND}}': 'ruff check .',
      '{{UNIT_COMMAND}}': 'pytest tests/unit/ -v',
      '{{INTEGRATION_COMMAND}}': 'pytest tests/integration/ -v -m integration',
      '{{SCENARIO_COMMAND}}': 'pytest tests/scenarios/ -v -m scenario',
    },
  },
  rust: {
    file: 'rust.yml',
    placeholders: {},
  },
};

const SAMPLE_SERVICES_BLOCK = `
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: testdb
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5`;

const SAMPLE_SERVICES_ENV = `
          DATABASE_URL: postgres://postgres:test@localhost:5432/testdb`;

function substituteTemplate(content, placeholders) {
  let result = content;
  for (const [key, value] of Object.entries(placeholders)) {
    result = result.replaceAll(key, value);
  }
  return result;
}

function stripServices(content) {
  // Remove everything between {{#IF_SERVICES}} and {{/IF_SERVICES}} inclusive
  return content.replace(/\s*\{\{#IF_SERVICES\}\}[\s\S]*?\{\{\/IF_SERVICES\}\}\n?/g, '\n');
}

function expandServices(content) {
  // Remove the markers but keep content, replace service placeholders
  return content
    .replace(/\s*\{\{#IF_SERVICES\}\}\n?/g, '\n')
    .replace(/\s*\{\{\/IF_SERVICES\}\}\n?/g, '\n')
    .replace(/\s*\{\{SERVICES_BLOCK\}\}/g, SAMPLE_SERVICES_BLOCK)
    .replace(/\s*\{\{SERVICES_ENV\}\}/g, SAMPLE_SERVICES_ENV);
}

function validateYaml(yamlContent, label) {
  const lines = yamlContent.split('\n');

  // Check 1: No tabs (YAML uses spaces only)
  for (let i = 0; i < lines.length; i++) {
    assert.ok(
      !lines[i].includes('\t'),
      `${label} line ${i + 1}: YAML must not contain tabs`
    );
  }

  // Check 2: Consistent indentation (multiples of 2)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '' || line.trim().startsWith('#')) continue;
    const indent = line.match(/^( *)/)[1].length;
    // Allow any even indentation (YAML standard)
    // But flag odd indentation as suspicious
    if (indent % 2 !== 0 && !line.trim().startsWith('-') && !line.trim().startsWith('>')) {
      // GitHub Actions YAML often uses 2-space indentation, odd indent is likely a bug
      // But some multiline strings can have odd indent, so just warn for key: lines
      if (line.trim().match(/^\w+.*:/)) {
        assert.fail(`${label} line ${i + 1}: odd indentation (${indent} spaces) on key line: "${line.trimEnd()}"`);
      }
    }
  }

  // Check 3: Has expected top-level keys for a GitHub Actions workflow
  assert.ok(yamlContent.includes('name:'), `${label}: missing 'name:' key`);
  assert.ok(yamlContent.includes('on:'), `${label}: missing 'on:' key`);
  assert.ok(yamlContent.includes('jobs:'), `${label}: missing 'jobs:' key`);

  // Check 4: No unmatched braces or brackets (common YAML syntax error)
  const stripped = yamlContent.replace(/#.*/g, '').replace(/['"][^'"]*['"]/g, '""');
  const openBraces = (stripped.match(/\{/g) || []).length;
  const closeBraces = (stripped.match(/\}/g) || []).length;
  assert.strictEqual(openBraces, closeBraces,
    `${label}: mismatched braces (${openBraces} open, ${closeBraces} close)`
  );

  // Check 5: No empty key values on 'run:' lines (would indicate missing placeholder)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === 'run:' || line === 'run: ') {
      assert.fail(`${label} line ${i + 1}: empty 'run:' value — missing command`);
    }
  }
}

function checkNoBareplaceholders(content, label) {
  const remaining = content.match(/\{\{[A-Z_]+\}\}/g);
  assert.ok(
    !remaining,
    `${label} has unsubstituted placeholders: ${remaining?.join(', ')}`
  );
}

describe('CI templates', () => {
  it('all 4 templates exist', () => {
    for (const [stack, config] of Object.entries(TEMPLATES)) {
      const filePath = path.join(TEMPLATES_DIR, config.file);
      assert.ok(fs.existsSync(filePath), `Missing CI template: ${config.file}`);
    }
  });

  for (const [stack, config] of Object.entries(TEMPLATES)) {
    describe(`${stack} template`, () => {
      const raw = fs.readFileSync(path.join(TEMPLATES_DIR, config.file), 'utf8');

      it('has all 4 required jobs', () => {
        assert.ok(raw.includes('lint:'), `${stack} template missing lint job`);
        assert.ok(raw.includes('unit-tests:'), `${stack} template missing unit-tests job`);
        assert.ok(raw.includes('integration-tests:'), `${stack} template missing integration-tests job`);
        assert.ok(raw.includes('scenario-tests:'), `${stack} template missing scenario-tests job`);
      });

      it('has proper job dependency chain', () => {
        // unit-tests needs lint, integration needs unit, scenario needs integration
        const unitMatch = raw.match(/unit-tests:[\s\S]*?needs:\s*lint/);
        assert.ok(unitMatch, `${stack}: unit-tests should depend on lint`);
        const integrationMatch = raw.match(/integration-tests:[\s\S]*?needs:\s*unit-tests/);
        assert.ok(integrationMatch, `${stack}: integration-tests should depend on unit-tests`);
        const scenarioMatch = raw.match(/scenario-tests:[\s\S]*?needs:\s*integration-tests/);
        assert.ok(scenarioMatch, `${stack}: scenario-tests should depend on integration-tests`);
      });

      it('uses IF_SERVICES conditionals for services', () => {
        const ifCount = (raw.match(/\{\{#IF_SERVICES\}\}/g) || []).length;
        const endCount = (raw.match(/\{\{\/IF_SERVICES\}\}/g) || []).length;
        assert.ok(ifCount > 0, `${stack} template should use IF_SERVICES conditionals`);
        assert.strictEqual(ifCount, endCount,
          `${stack} template has mismatched IF_SERVICES tags: ${ifCount} opens, ${endCount} closes`
        );
      });

      it('produces valid YAML without services', () => {
        let content = substituteTemplate(raw, config.placeholders);
        content = stripServices(content);
        checkNoBareplaceholders(content, `${stack} (no services)`);
        validateYaml(content, `${stack} (no services)`);
      });

      it('produces valid YAML with services', () => {
        let content = substituteTemplate(raw, config.placeholders);
        content = expandServices(content);
        checkNoBareplaceholders(content, `${stack} (with services)`);
        validateYaml(content, `${stack} (with services)`);
      });

      it('triggers on push and PR to main', () => {
        assert.ok(raw.includes('push:'), `${stack} template should trigger on push`);
        assert.ok(raw.includes('pull_request:'), `${stack} template should trigger on PR`);
        assert.ok(raw.includes('branches: [main]'), `${stack} template should target main branch`);
      });
    });
  }
});
