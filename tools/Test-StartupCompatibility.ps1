param(
    [Parameter(Mandatory)][string]$Executable,
    [Parameter(Mandatory)][string]$Version,
    [string]$Label = 'startup',
    [switch]$RequireAllPass,
    [switch]$DisableSandboxForRestrictedToken
)
$ErrorActionPreference = 'Stop'
if ($Version -notmatch '^\d+\.\d+\.\d+$' -or $Label -notmatch '^[a-zA-Z0-9_-]+$') { throw 'Invalid version or label' }
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$Executable = (Resolve-Path -LiteralPath $Executable).Path
# Each invocation owns a new fixture directory. Never modify the real user/system TEMP ACL.
$runRoot = Join-Path $taskRoot ('docs/verification/startup-' + $Label + '-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $runRoot -Force | Out-Null
$asciiTemp = Join-Path $runRoot 'temp'
$unicodeTemp = Join-Path $runRoot '用户 张三 日本語 é/临时 文件'
$deniedTemp = Join-Path $runRoot 'denied-temp'
foreach ($dir in @($asciiTemp, $unicodeTemp, $deniedTemp)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
$fileTemp = Join-Path $runRoot 'temp-is-a-file'
[IO.File]::WriteAllText($fileTemp, 'Not a directory')
$originalAcl = Get-Acl -LiteralPath $deniedTemp
$denyAcl = Get-Acl -LiteralPath $deniedTemp
$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$rule = [Security.AccessControl.FileSystemAccessRule]::new($identity.User, [Security.AccessControl.FileSystemRights]::Write, [Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit', [Security.AccessControl.PropagationFlags]::None, [Security.AccessControl.AccessControlType]::Deny)
$denyAcl.AddAccessRule($rule)
if (-not ('RuinaStartupWindows' -as [type])) {
    Add-Type @'
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class RuinaStartupWindows {
    delegate bool Callback(IntPtr h, IntPtr p);
    [DllImport("user32.dll")] static extern bool EnumWindows(Callback c, IntPtr p);
    [DllImport("user32.dll")] static extern bool EnumChildWindows(IntPtr h, Callback c, IntPtr p);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint p);
    [DllImport("user32.dll", CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr h, StringBuilder b, int n);
    static string Text(IntPtr h) { var b = new StringBuilder(2048); GetWindowText(h, b, b.Capacity); return b.ToString(); }
    public static string[] Read(int pid) {
        var result = new List<string>();
        EnumWindows((h,p) => { uint owner; GetWindowThreadProcessId(h, out owner);
            if (owner == pid) { result.Add(Text(h)); EnumChildWindows(h, (c,q) => { result.Add(Text(c)); return true; }, IntPtr.Zero); }
            return true;
        }, IntPtr.Zero);
        return result.ToArray();
    }
}
'@
}
$results = @()
try {
    Set-Acl -LiteralPath $deniedTemp -AclObject $denyAcl
    $denyVerified = $false
    try { [IO.File]::WriteAllText((Join-Path $deniedTemp 'probe'), 'probe') } catch [UnauthorizedAccessException] { $denyVerified = $true }
    if (!$denyVerified) { throw 'Fixture ACL did not deny writes; test would be misleading.' }
    $cases = @(
        @{ Name = 'normal'; Temp = $asciiTemp },
        @{ Name = 'unicode-spaces'; Temp = $unicodeTemp },
        @{ Name = 'missing-parent'; Temp = (Join-Path $runRoot 'missing/parent/temp') },
        @{ Name = 'temp-is-file'; Temp = $fileTemp },
        @{ Name = 'access-denied'; Temp = $deniedTemp }
    )
    foreach ($case in $cases) {
        $prefix = Join-Path $runRoot $case.Name
        $start = [Diagnostics.ProcessStartInfo]::new($Executable)
        $start.UseShellExecute = $false
        $start.CreateNoWindow = $true
        $start.WindowStyle = [Diagnostics.ProcessWindowStyle]::Hidden
        $start.RedirectStandardOutput = $true
        $start.RedirectStandardError = $true
        $start.WorkingDirectory = Split-Path -Parent $Executable
        # Keep Electron's normal sandbox and GPU settings; isolate user settings without changing USERPROFILE.
        $start.ArgumentList.Add('--user-data-dir=' + (Join-Path $runRoot ('用户配置 ' + $case.Name)))
        if ($DisableSandboxForRestrictedToken) {
            # Chromium cannot create its sandbox inside the Codex restricted Windows token.
            # This is a test-only flag, never a shipping launcher setting.
            $start.ArgumentList.Add('--no-sandbox')
            $start.ArgumentList.Add('--disable-gpu')
        }
        foreach ($key in @('TEMP', 'TMP')) { $start.Environment[$key] = $case.Temp }
        $start.Environment.Remove('ELECTRON_RUN_AS_NODE') | Out-Null
        $start.Environment['RUINA_SCREENSHOT'] = $prefix + '.png'
        $start.Environment['RUINA_DUMP_TEXT'] = $prefix + '.txt'
        $start.Environment['RUINA_ERROR_LOG'] = $prefix + '-errors.txt'
        $start.Environment['RUINA_SCREENSHOT_DELAY'] = '600'
        $start.Environment['RUINA_EXEC_JS'] = 'if (!document.body.textContent.includes(' + ('V' + $Version | ConvertTo-Json -Compress) + ')) throw new Error("Wrong packaged version");'
        $process = [Diagnostics.Process]::new()
        $process.StartInfo = $start
        $timer = [Diagnostics.Stopwatch]::StartNew()
        $windows = @()
        try {
            $process.Start() | Out-Null
            $stdoutTask = $process.StandardOutput.ReadToEndAsync()
            $stderrTask = $process.StandardError.ReadToEndAsync()
            while (!$process.WaitForExit(500) -and $timer.Elapsed.TotalSeconds -lt 35) {
                $windows = [RuinaStartupWindows]::Read($process.Id)
                if ($windows -contains 'NSIS Error') { break }
            }
            $interrupted = !$process.HasExited
            $timedOut = $interrupted -and $timer.Elapsed.TotalSeconds -ge 35
            if ($interrupted) { $process.Kill($true); $process.WaitForExit(5000) | Out-Null }
            $stderr = $stderrTask.GetAwaiter().GetResult()
            [IO.File]::WriteAllText($prefix + '-stderr.txt', $stderr)
            $textPath = $prefix + '.txt'
            $passed = !$interrupted -and $process.ExitCode -eq 0 -and (Test-Path -LiteralPath $textPath) -and !(Test-Path -LiteralPath ($prefix + '-errors.txt'))
            if ($passed) { $passed = [IO.File]::ReadAllText($textPath).Contains('V' + $Version) }
            $row = [pscustomobject]@{ Case = $case.Name; Passed = $passed; ExitCode = $process.ExitCode; TimedOut = $timedOut; Seconds = [math]::Round($timer.Elapsed.TotalSeconds, 1); Dialog = ($windows -join ' | '); Temp = $case.Temp }
            $results += $row
            $row | ConvertTo-Json -Compress | Write-Output
        } finally {
            if ($process.Id -and !$process.HasExited) { $process.Kill($true) }
            $process.Dispose()
        }
    }
} finally {
    Set-Acl -LiteralPath $deniedTemp -AclObject $originalAcl
    $report = [pscustomobject]@{ Executable = $Executable; Version = $Version; Identity = $identity.Name; OS = [Environment]::OSVersion.VersionString; DisableSandboxForRestrictedToken = [bool]$DisableSandboxForRestrictedToken; Cases = $results }
    $report | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $runRoot 'results.json') -Encoding utf8
    Write-Output "Report: $runRoot/results.json"
}
if ($RequireAllPass -and ($results.Count -ne 5 -or ($results | Where-Object { !$_.Passed }))) { throw 'Startup compatibility test failed; see report.' }
