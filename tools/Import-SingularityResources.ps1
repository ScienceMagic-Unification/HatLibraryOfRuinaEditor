param(
    [string]$Assemblies = 'D:/Program Files (x86)/Steam/steamapps/common/Library Of Ruina/LibraryOfRuina_Data/Mods/梦幻宇宙/Assemblies/1FrameworkAssemblies',
    [string]$Dnlib = 'D:/软件/dnSpy6.1.8/bin/dnlib.dll'
)
# Read metadata/resources only. Never load or initialize a game assembly.
$ErrorActionPreference = 'Stop'
Add-Type -Path $Dnlib
$output = Join-Path $PSScriptRoot '../apps/desktop/src/renderer/src/assets/plugins'
New-Item -ItemType Directory -Force -Path $output | Out-Null
$manifestPath = Join-Path $output 'manifest.json'
$previous = if (Test-Path -LiteralPath $manifestPath) { (Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json).resources } else { @() }
$resources = @()
$assembliesInfo = @()
$sha = [Security.Cryptography.SHA256]::Create()
try {
    foreach ($file in Get-ChildItem -LiteralPath $Assemblies -Filter 'HatSingularity*.dll' | Sort-Object Name) {
        $module = [dnlib.DotNet.ModuleDefMD]::Load($file.FullName)
        try {
            $assembliesInfo += @{ plugin=$file.BaseName; sha256=(Get-FileHash -LiteralPath $file.FullName).Hash.ToLowerInvariant(); version=$module.Assembly.Version.ToString() }
            foreach ($resource in $module.Resources) {
                if ($resource -isnot [dnlib.DotNet.EmbeddedResource]) { continue }
                $name = $resource.Name.ToString()
                $ext = [IO.Path]::GetExtension($name).ToLowerInvariant()
                $bytes = $resource.CreateReader().ToArray()
                $hash = [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','').ToLowerInvariant()
                $key = [BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($file.BaseName+':'+$name))).Replace('-','').Substring(0,16).ToLowerInvariant()
                $isBundle = $bytes.Length -ge 7 -and [Text.Encoding]::ASCII.GetString($bytes,0,7) -in @('UnityFS','UnityRa','UnityWe')
                $kind = if ($ext -in @('.png','.jpg','.jpeg','.webp','.gif')) {'image'} elseif ($ext -eq '.xml') {'xml'} elseif ($isBundle -or $ext -eq '.assetbundle') {'bundle'} else {'other'}
                $path = if ($kind -in @('image','xml')) { $key+$ext } else { '' }
                if ($path) { [IO.File]::WriteAllBytes((Join-Path $output $path),$bytes) }
                $language = if ($name -match '\.(cn|en|jp|ja|kr|ko|ru|es|fr|de|pt|tr|zh-Hant)(?:\.|$)') { $Matches[1] } else { '' }
                $resources += @{plugin=$file.BaseName; name=$name; path=$path; sha256=$hash; kind=$kind; language=$language; id=($name -split '\.')[-2]}
            }
        } finally { $module.Dispose() }
    }
    $manifest = @{assemblies=$assembliesInfo; resources=$resources}
    # Only remove unchanged generated files recorded by the previous snapshot.
    $outputRoot = [IO.Path]::GetFullPath($output).TrimEnd('\','/') + [IO.Path]::DirectorySeparatorChar
    foreach ($old in $previous) {
        if (!$old.path -or $resources.path -contains $old.path) { continue }
        $stale = [IO.Path]::GetFullPath((Join-Path $output $old.path))
        if (!$stale.StartsWith($outputRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Snapshot path outside output directory' }
        if ((Test-Path -LiteralPath $stale) -and (Get-FileHash -LiteralPath $stale).Hash.ToLowerInvariant() -eq $old.sha256) { Remove-Item -LiteralPath $stale }
    }
    [IO.File]::WriteAllText((Join-Path $output 'manifest.json'), ($manifest | ConvertTo-Json -Depth 6), [Text.UTF8Encoding]::new($false))
    $resources | Group-Object kind | Select-Object Name,Count
} finally { $sha.Dispose() }
