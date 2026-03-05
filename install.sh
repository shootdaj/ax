#!/usr/bin/env bash
set -euo pipefail

# AX Installer — installs AX commands and references to ~/.claude/
# Usage: curl -fsSL https://raw.githubusercontent.com/shootdaj/ax/main/install.sh | bash

REPO="shootdaj/ax"
BRANCH="main"
INSTALL_DIR="$HOME/.claude"
TMP_DIR=$(mktemp -d)

cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

echo "Installing AX..."

# Check prerequisites
if ! command -v claude &>/dev/null; then
  echo "Warning: Claude Code CLI not found. Install it first: https://docs.anthropic.com/en/docs/claude-code"
fi

if ! command -v git &>/dev/null; then
  echo "Error: git is required"
  exit 1
fi

# Check if GSD is installed
if [ ! -d "$INSTALL_DIR/commands/gsd" ]; then
  echo "Warning: GSD not found at $INSTALL_DIR/commands/gsd/"
  echo "AX requires GSD. Install it: npx get-shit-done-cc --claude --global"
  echo ""
fi

# Clone repo
echo "Downloading from github.com/$REPO..."
git clone --depth 1 --branch "$BRANCH" "https://github.com/$REPO.git" "$TMP_DIR/ax" 2>/dev/null

# Create target directories
mkdir -p "$INSTALL_DIR/commands/ax"
mkdir -p "$INSTALL_DIR/ax"

# Check for existing install
if [ -d "$INSTALL_DIR/commands/ax" ] && [ "$(ls -A "$INSTALL_DIR/commands/ax" 2>/dev/null)" ]; then
  echo "Updating existing AX installation..."
fi

# Copy commands
cp -r "$TMP_DIR/ax/.claude/commands/ax/"* "$INSTALL_DIR/commands/ax/"

# Copy references and utilities
cp -r "$TMP_DIR/ax/.claude/ax/"* "$INSTALL_DIR/ax/"

echo ""
echo "AX installed successfully!"
echo ""
echo "  Commands:   $INSTALL_DIR/commands/ax/"
echo "  References: $INSTALL_DIR/ax/"
echo ""
echo "Usage: Open Claude Code in any project and run /ax:init"
