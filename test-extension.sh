#!/bin/bash
# Build, verify, package and install the Reminders extension for UAT.
#
# Same shape as the one in vscode-extension-copilot-cli, with the checks this
# repo insists on before anything gets installed. The install step is the point:
# a compiled bundle is not an installed extension, and reloading the window
# after only running esbuild shows an empty status bar forever.
#
# Usage:
#   ./test-extension.sh              # verify, package, install
#   ./test-extension.sh --no-install # stop after packaging
set -e

cd "$(dirname "$0")"

INSTALL=1
[ "${1:-}" = "--no-install" ] && INSTALL=0

NAME=$(node -p "require('./package.json').name")
VERSION=$(node -p "require('./package.json').version")
PUBLISHER=$(node -p "require('./package.json').publisher")
VSIX="$NAME-$VERSION.vsix"
ID="$PUBLISHER.$NAME"

[ -d node_modules ] || { echo "📦 Installing dependencies..."; npm install --silent; }

echo "🔍 Typechecking..."
./node_modules/.bin/tsc --noEmit

echo ""
echo "🧪 Running tests..."
npx vitest run 2>&1 | grep -E "Test Files|Tests "

echo ""
echo "🧱 Checking the pure modules stayed pure..."
# parse, format, model and plan are the part that has to be right, which is why
# they are the part that is trivially testable. Nothing else notices if the
# boundary dissolves.
if grep -l "from 'vscode'" src/parse.ts src/format.ts src/model.ts src/plan.ts 2>/dev/null; then
  echo "❌ vscode leaked into a pure module (listed above)"
  exit 1
fi
echo "   parse, format, model and plan import nothing from vscode"

echo ""
echo "🔨 Building extension..."
npm run compile

echo ""
echo "📦 Packaging VSIX..."
rm -f ./*.vsix
npx @vscode/vsce package --no-git-tag-version --allow-star-activation --allow-missing-repository --skip-license 2>&1 | grep -v "WARNING"

if [ "$INSTALL" = "0" ]; then
  echo ""
  echo "✅ Packaged $VSIX (not installed, --no-install)"
  exit 0
fi

echo ""
echo "🗑️  Uninstalling old version..."
code --uninstall-extension "$ID" 2>/dev/null || true

echo ""
echo "📥 Installing new version..."
code --install-extension "$VSIX"

INSTALLED=$(code --list-extensions --show-versions 2>/dev/null | grep -i "^$ID@" || true)
if [ "$INSTALLED" != "$ID@$VERSION" ]; then
  echo "❌ Expected $ID@$VERSION, code reports '${INSTALLED:-nothing}'"
  exit 1
fi

echo ""
echo "✅ Done! Extension installed: $INSTALLED"
echo ""
echo "📋 Next steps:"
echo "   1. Reload VS Code window (Ctrl+Shift+P -> 'Developer: Reload Window')"
echo "   2. Open a file with a real error first — the bell hides itself at zero,"
echo "      so an empty board and a broken extension look identical"
echo "   3. Look bottom-LEFT: a bell and a count, beside the errors and warnings"
echo "   4. Click it for the quick pick; check the Panel for a Reminders tab"
echo "   5. If neither appears, Output (Ctrl+Shift+U) -> 'Extension Host' is the"
echo "      only place an activation failure is written down"
