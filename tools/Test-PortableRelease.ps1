param([string]$Version = '0.2.4', [ValidateSet('keywords', 'workspaces')][string]$TestSuite = 'keywords')
$ErrorActionPreference = 'Stop'
if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw 'Expected a semantic release version' }
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$executable = Join-Path $taskRoot "apps/desktop/release/帽子的废墟图书馆编辑器-$Version-portable.exe"
if (!(Test-Path -LiteralPath $executable)) { throw "Missing portable executable: $executable" }
$env:RUINA_SCREENSHOT = Join-Path $taskRoot "docs/verification/portable-$Version-$TestSuite.png"
$env:RUINA_DUMP_TEXT = Join-Path $taskRoot "docs/verification/portable-$Version-$TestSuite.txt"
$env:RUINA_ERROR_LOG = Join-Path $taskRoot "docs/verification/portable-$Version-$TestSuite-errors.txt"
if (Test-Path -LiteralPath $env:RUINA_ERROR_LOG) { Remove-Item -LiteralPath $env:RUINA_ERROR_LOG }
$env:RUINA_SCREENSHOT_DELAY = '2200'
$versionCheck = 'if (!document.body.textContent.includes(' + ('V' + $Version | ConvertTo-Json -Compress) + ')) throw new Error("Wrong packaged version");'
$testScript = if ($TestSuite -eq 'workspaces') { 'verify-workspaces-ui.js' } else { 'verify-keyword-values-ui.js' }
$testRootVariable = if ($TestSuite -eq 'workspaces') { 'window.__workspaceTestRoot' } else { 'window.__keywordTestRoot' }
$env:RUINA_EXEC_JS = $versionCheck + $testRootVariable + ' = ' + ($taskRoot.Replace('\','/') | ConvertTo-Json -Compress) + ';' + [IO.File]::ReadAllText((Join-Path $PSScriptRoot $testScript))
$started = Get-Date
$process = Start-Process -FilePath $executable -ArgumentList @('--disable-gpu','--no-sandbox') -WindowStyle Hidden -PassThru
if (!$process.WaitForExit(60000)) { throw 'Portable verification has not completed within 60 seconds.' }
if ($process.ExitCode -ne 0) { throw "Portable exit code: $($process.ExitCode)" }
if (Test-Path -LiteralPath $env:RUINA_ERROR_LOG) { throw ([IO.File]::ReadAllText($env:RUINA_ERROR_LOG)) }
$resultName = if ($TestSuite -eq 'workspaces') { 'workspaces-ui-result.txt' } else { 'keyword-values-ui-result.txt' }
$resultPath = Join-Path $taskRoot "docs/verification/$resultName"
if (!(Test-Path -LiteralPath $resultPath) -or (Get-Item -LiteralPath $resultPath).LastWriteTime -lt $started) { throw 'Portable did not produce a fresh test result.' }
"Portable V$Version startup and version check passed."
Get-Content -LiteralPath $resultPath
