# Build, verify, package and install the Reminders extension for UAT.
# The Windows twin of test-extension.sh — same gates, same order.
#
# Usage:
#   .\test-extension.ps1              # verify, package, install
#   .\test-extension.ps1 -NoInstall   # stop after packaging

param([switch]$NoInstall)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

function Assert-LastExit($what) {
    if ($LASTEXITCODE -ne 0) { Write-Host "[FAIL] $what" -ForegroundColor Red; exit $LASTEXITCODE }
}

$Name      = node -p "require('./package.json').name"
$Version   = node -p "require('./package.json').version"
$Publisher = node -p "require('./package.json').publisher"
$Vsix      = "$Name-$Version.vsix"
$Id        = "$Publisher.$Name"

if (-not (Test-Path node_modules/.bin/tsc.cmd)) {
    Write-Host "`nInstalling dependencies..." -ForegroundColor Cyan
    npm install --silent
    Assert-LastExit "npm install"
}

Write-Host "`nTypechecking..." -ForegroundColor Cyan
./node_modules/.bin/tsc.cmd --noEmit
Assert-LastExit "tsc --noEmit"

Write-Host "`nRunning tests..." -ForegroundColor Cyan
npx vitest run 2>&1 | Select-String -Pattern "Test Files|Tests "
Assert-LastExit "vitest"

# The four pure modules are the part that has to be right, which is why they are
# the part that is trivially testable. That only holds while they import no vscode.
Write-Host "`nChecking the pure modules stayed pure..." -ForegroundColor Cyan
$Leaks = Select-String -Path src/parse.ts, src/format.ts, src/model.ts, src/plan.ts `
    -Pattern "(from|require\()\s*['""]vscode['""]"
if ($Leaks) {
    $Leaks | ForEach-Object { Write-Host $_ -ForegroundColor Red }
    Write-Host "[FAIL] vscode leaked into a pure module (listed above)" -ForegroundColor Red
    exit 1
}
Write-Host "   parse, format, model and plan import nothing from vscode"

Write-Host "`nBuilding extension..." -ForegroundColor Cyan
npm run compile
Assert-LastExit "npm run compile"

Write-Host "`nPackaging VSIX..." -ForegroundColor Cyan
Remove-Item *.vsix -ErrorAction SilentlyContinue
npx vsce package --no-git-tag-version 2>&1 | Where-Object { $_ -notmatch "WARNING" }
Assert-LastExit "vsce package"

if ($NoInstall) {
    Write-Host "`n[OK] Packaged $Vsix (not installed, -NoInstall)" -ForegroundColor Green
    exit 0
}

# The publisher prefix is required — `code --uninstall-extension reminders` matches
# nothing and exits 0, so a missing prefix reads as success while doing nothing.
Write-Host "`nUninstalling old version..." -ForegroundColor Yellow
try { code --uninstall-extension $Id 2>$null } catch {}

Write-Host "`nInstalling new version..." -ForegroundColor Green
# --force so a same-version reinstall (the common dev iteration) is not skipped
code --install-extension $Vsix --force
Assert-LastExit "code --install-extension"

$Installed = (code --list-extensions --show-versions 2>$null | Select-String "^$([regex]::Escape($Id))@").ToString()
if ($Installed -ne "$Id@$Version") {
    Write-Host "[FAIL] Expected $Id@$Version, code reports '$(if ($Installed) { $Installed } else { 'nothing' })'" -ForegroundColor Red
    exit 1
}

Write-Host "`n[OK] Extension installed: $Installed" -ForegroundColor Green
Write-Host @"

Next steps:
   1. Reload the window (Ctrl+Shift+P -> 'Developer: Reload Window')
   2. Look bottom-left for the bell and a count
   3. Click it for the quick pick
   4. Open the Reminders panel beside Terminal and tick one off
"@
