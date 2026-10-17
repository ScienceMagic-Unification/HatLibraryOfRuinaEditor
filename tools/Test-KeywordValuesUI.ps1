$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$env:RUINA_SCREENSHOT = Join-Path $taskRoot 'docs/verification/keyword-values-ui.png'
$env:RUINA_DUMP_TEXT = Join-Path $taskRoot 'docs/verification/keyword-values-ui.txt'
$env:RUINA_ERROR_LOG = Join-Path $taskRoot 'docs/verification/keyword-values-ui-errors.txt'
if (Test-Path -LiteralPath $env:RUINA_ERROR_LOG) { Remove-Item -LiteralPath $env:RUINA_ERROR_LOG }
$env:RUINA_SCREENSHOT_DELAY = '2200'
$env:RUINA_EXEC_JS = 'window.__keywordTestRoot = ' + ($taskRoot.Replace('\','/') | ConvertTo-Json -Compress) + ';' + [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'verify-keyword-values-ui.js'))
$started = Get-Date
$process = Start-Process -FilePath (Join-Path $taskRoot 'apps/desktop/node_modules/electron/dist/electron.exe') -ArgumentList @('--disable-gpu','--no-sandbox',('"'+(Join-Path $taskRoot 'apps/desktop')+'"')) -WindowStyle Hidden -PassThru
if (!$process.WaitForExit(30000)) { throw 'UI verification has not completed within 30 seconds.' }
if (Test-Path -LiteralPath $env:RUINA_ERROR_LOG) { throw ([IO.File]::ReadAllText($env:RUINA_ERROR_LOG)) }
$resultPath = Join-Path $taskRoot 'docs/verification/keyword-values-ui-result.txt'
if (!(Test-Path -LiteralPath $resultPath) -or (Get-Item -LiteralPath $resultPath).LastWriteTime -lt $started) { throw 'UI verification did not write a fresh result.' }
Get-Content -LiteralPath $resultPath
