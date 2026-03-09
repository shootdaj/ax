#!/usr/bin/env bash
set -euo pipefail

# AX Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/shootdaj/ax/main/install.sh | bash
#
# Preferred method: npx github:shootdaj/ax --global

REPO="shootdaj/ax"
BRANCH="main"
INSTALL_DIR="$HOME/.claude"
TMP_DIR=$(mktemp -d)

cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

echo "Installing AX..."

# Check prerequisites
if ! command -v git &>/dev/null; then
  echo "Error: git is required"
  exit 1
fi

if ! command -v claude &>/dev/null; then
  echo "Warning: Claude Code CLI not found. Install it first: https://docs.anthropic.com/en/docs/claude-code"
fi

if [ ! -d "$INSTALL_DIR/commands/gsd" ]; then
  echo "Warning: GSD not found. AX requires GSD."
  echo "Install it: npx get-shit-done-cc --claude --global"
  echo ""
fi

# Clone repo
echo "Downloading from github.com/$REPO..."
git clone --depth 1 --branch "$BRANCH" "https://github.com/$REPO.git" "$TMP_DIR/ax" 2>/dev/null

# Check for existing install
if [ -d "$INSTALL_DIR/commands/ax" ] && [ "$(ls -A "$INSTALL_DIR/commands/ax" 2>/dev/null)" ]; then
  echo "Updating existing AX installation..."
fi

# Copy skills → commands
mkdir -p "$INSTALL_DIR/commands/ax"
for skill_dir in "$TMP_DIR/ax/skills"/*/; do
  skill=$(basename "$skill_dir")
  if [ -f "$skill_dir/SKILL.md" ]; then
    cp "$skill_dir/SKILL.md" "$INSTALL_DIR/commands/ax/${skill}.md"
  fi
done

# Copy references
mkdir -p "$INSTALL_DIR/ax/references"
cp -r "$TMP_DIR/ax/references/"* "$INSTALL_DIR/ax/references/"

# Copy scripts
if [ -d "$TMP_DIR/ax/scripts" ]; then
  for file in "$TMP_DIR/ax/scripts"/*; do
    cp "$file" "$INSTALL_DIR/ax/"
  done
fi

# Write version
version=$(node -e "console.log(require('$TMP_DIR/ax/package.json').version)" 2>/dev/null || echo "unknown")
echo "$version" > "$INSTALL_DIR/ax/VERSION"

echo ""
echo "AX installed successfully!"
echo ""
echo "  Commands:   $INSTALL_DIR/commands/ax/"
echo "  References: $INSTALL_DIR/ax/"
echo "  Version:    $version"
echo ""
echo "Usage: Open Claude Code in any project and run /ax:init"
