param([string]$Version)
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (!$Version) { $Version = (Get-Content -Raw -LiteralPath (Join-Path $taskRoot 'apps/desktop/package.json') | ConvertFrom-Json).version }
if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw 'Expected a semantic release version' }
$releaseDir = Join-Path $taskRoot 'apps/desktop/release'
$archivePath = Join-Path $releaseDir "HatLibraryOfRuinaEditor-$Version-win-x64.zip"
$archive = [IO.Compression.ZipFile]::OpenRead($archivePath)
try {
    # A ZIP containing only the NSIS portable EXE is not a compatibility package.
    foreach ($name in @('帽子的废墟图书馆编辑器.exe', 'resources/app.asar', 'locales/zh-CN.pak', 'icudtl.dat', 'ffmpeg.dll', 'resources.pak', 'README.zh-CN.txt')) {
        $entry = $archive.GetEntry($name)
        if (!$entry -or $entry.Length -eq 0) { throw "Missing application payload: $name" }
        $stream = $entry.Open()
        try { $archiveHash = [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($stream)) }
        finally { $stream.Dispose() }
        $source = Join-Path $releaseDir ('win-unpacked/' + $name)
        if ($archiveHash -ne (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash) { throw "Archive content differs from packaged application: $name" }
    }
    if ($archive.Entries | Where-Object { $_.Name -like '*-portable.exe' }) { throw 'Compatibility archive must contain the application, not the NSIS launcher.' }
    "Windows compatibility ZIP V$Version contains the complete application; required payload hashes match win-unpacked."
} finally { $archive.Dispose() }
