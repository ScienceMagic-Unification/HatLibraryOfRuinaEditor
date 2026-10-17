param([string]$SourceRoot = 'D:/360data/重要数据/我的文档/ChatGPT/废墟图书馆动作系统')
$ErrorActionPreference = 'Stop'
# Enchantments owns the ability catalog. The other inputs override XML only; never read old DLL translations.
& (Join-Path $PSScriptRoot 'Import-SingularityProject.ps1') -Project (Join-Path $SourceRoot 'HatSingularity.Enchantments/HatSingularity.Enchantments.csproj')
$output = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../apps/desktop/src/renderer/src/assets/plugins'))
$manifestPath = Join-Path $output 'manifest.json'
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$inputs = @()
foreach ($plugin in @('HatSingularity.Abilities','HatSingularity.KeywordView','HatSingularity.Utils')) {
  $root = Join-Path $SourceRoot "output/SingularityLocalization-20261011/CoreReady/$plugin"
  foreach ($file in Get-ChildItem -LiteralPath (Join-Path $root 'Resources') -Filter '*.xml' -Recurse -File) { $inputs += @{plugin=$plugin;root=$root;file=$file;source='CoreReady-20261011'} }
}
foreach ($plugin in @('HatSingularity.Tags','HatSingularity.UI')) {
  $root = Join-Path $SourceRoot $plugin
  $paths = if ($plugin -eq 'HatSingularity.Tags') { @('Resources/Localization','Resources/Keywords','Resources/UI') } else { @('Resources/SidebarTexts.xml') }
  foreach ($path in $paths) {
    foreach ($file in Get-ChildItem -LiteralPath (Join-Path $root $path) -Filter '*.xml' -Recurse -File) { $inputs += @{plugin=$plugin;root=$root;file=$file;source='project-localization'} }
  }
}
$sha = [Security.Cryptography.SHA256]::Create()
try {
  foreach ($input in $inputs) {
    $relative = $input.file.FullName.Substring($input.root.Length + 1).Replace('\','/')
    $name = $input.plugin + '.' + $relative.Replace('/','.')
    $bytes = [IO.File]::ReadAllBytes($input.file.FullName)
    [xml]$validated = [Text.Encoding]::UTF8.GetString($bytes).TrimStart([char]0xFEFF)
    $hash = [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','').ToLowerInvariant()
    $key = [BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($input.plugin+':'+$name))).Replace('-','').Substring(0,16).ToLowerInvariant()+'.xml'
    $language = if ($relative -match '(?:/|\.)(cn|en|jp|kr)(?:/|\.)') { $Matches[1] } else { '' }
    [IO.File]::WriteAllBytes((Join-Path $output $key), $bytes)
    $resource = @{plugin=$input.plugin;name=$name;path=$key;sha256=$hash;kind='xml';language=$language;id=$input.file.BaseName;source=$input.source;sourcePath=$input.file.FullName}
    $manifest.resources = @($manifest.resources | Where-Object { $_.name -ne $name -or $_.plugin -ne $input.plugin }) + $resource
  }
  [IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 10), [Text.UTF8Encoding]::new($false))
  "Imported $($inputs.Count) authoritative localization XML files (CoreReady, Tags, UI)."
} finally { $sha.Dispose() }
