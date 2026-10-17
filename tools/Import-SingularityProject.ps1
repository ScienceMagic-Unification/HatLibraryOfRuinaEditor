param([string]$Project = 'D:/360data/重要数据/我的文档/ChatGPT/废墟图书馆动作系统/HatSingularity.Enchantments/HatSingularity.Enchantments.csproj')
# Read source resources only; never build the project or write to the game/Mod.
$ErrorActionPreference = 'Stop'
$projectPath = [IO.Path]::GetFullPath($Project)
$sourceRoot = Split-Path $projectPath
[xml]$projectXml = [IO.File]::ReadAllText($projectPath)
$plugin = [string]($projectXml.Project.PropertyGroup.AssemblyName | Where-Object { $_ } | Select-Object -First 1)
$namespace = [string]($projectXml.Project.PropertyGroup.RootNamespace | Where-Object { $_ } | Select-Object -First 1)
if (!$plugin -or !$namespace) { throw 'Project must declare AssemblyName and RootNamespace' }
$output = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../apps/desktop/src/renderer/src/assets/plugins'))
$manifestPath = Join-Path $output 'manifest.json'
$abilityPath = [IO.Path]::GetFullPath((Join-Path $output '../abilities-manifest.json'))
$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$catalog = Get-Content -LiteralPath $abilityPath -Raw | ConvertFrom-Json
$sourceFiles = @($projectXml.Project.ItemGroup.Compile | ForEach-Object {
  $pattern = $_.Include.Replace('\','/')
  if ($pattern -match '^([^*]+)/\*\*/(\*\.[a-zA-Z0-9]+)$') {
    Get-ChildItem -LiteralPath (Join-Path $sourceRoot $Matches[1]) -Recurse -File -Filter $Matches[2]
  } else {
    Get-ChildItem -Path (Join-Path $sourceRoot $pattern) -File
  }
} | Sort-Object FullName -Unique)
$versionSource = ($sourceFiles | ForEach-Object { [IO.File]::ReadAllText($_.FullName) }) -join "`n"
$version = [regex]::Match($versionSource, 'AssemblyVersion\("([^"]+)"\)').Groups[1].Value
if (!$version) { throw 'AssemblyVersion missing' }
$sourceHashes = @($sourceFiles | ForEach-Object { @{path=$_.FullName.Substring($sourceRoot.Length+1).Replace('\','/');sha256=(Get-FileHash -LiteralPath $_.FullName).Hash.ToLowerInvariant()} })
$abilities = @($sourceFiles | ForEach-Object {
  $source = [IO.File]::ReadAllText($_.FullName)
  foreach ($match in [regex]::Matches($source, '\bpublic\s+(?:sealed\s+)?class\s+(DiceCard(Self)?Ability_([A-Za-z0-9_]+))\s*:')) {
    @{id=$match.Groups[3].Value;kind=$(if($match.Groups[2].Success){'card'}else{'dice'});type="$namespace.$($match.Groups[1].Value)";plugin=$plugin;version=$version}
  }
} | Sort-Object id -Unique)
$sha = [Security.Cryptography.SHA256]::Create()
try {
  $resources = @()
  $payloads = @{}
  foreach ($item in $projectXml.Project.ItemGroup.EmbeddedResource) {
    # Current projects embed Resources recursively; resolve each declared pattern.
    $pattern = $item.Include.Replace('\','/')
    if ($pattern -notmatch '^([^*]+)/\*\*/(\*\.[a-zA-Z0-9]+)$') { throw "Unsupported resource glob: $pattern" }
    foreach ($file in Get-ChildItem -LiteralPath (Join-Path $sourceRoot $Matches[1]) -Recurse -File -Filter $Matches[2] | Sort-Object FullName) {
      $relative = $file.FullName.Substring($sourceRoot.Length+1).Replace('\','/')
      $name = $namespace + '.' + $relative.Replace('/','.')
      $bytes = [IO.File]::ReadAllBytes($file.FullName)
      if ($file.Extension -eq '.xml') { [xml]$validate = [Text.Encoding]::UTF8.GetString($bytes).TrimStart([char]0xFEFF) }
      $hash = [BitConverter]::ToString($sha.ComputeHash($bytes)).Replace('-','').ToLowerInvariant()
      $key = [BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($plugin+':'+$name))).Replace('-','').Substring(0,16).ToLowerInvariant()
      $kind = if($file.Extension -eq '.xml'){'xml'}else{'image'}
      $path = $key + $file.Extension.ToLowerInvariant()
      $language = if($relative -match '/Localization/([^/]+)/'){$Matches[1]}else{''}
      $resources += @{plugin=$plugin;name=$name;path=$path;sha256=$hash;kind=$kind;language=$language;id=$file.BaseName;sourcePath=$relative}
      $payloads[$path] = $bytes
    }
  }
  if (!$abilities.Count -or !$resources.Count) { throw 'Empty source snapshot; refusing to replace existing resources' }
  foreach($resource in $resources | Where-Object { $_.name -match '\.Abilities\.xml$' }) {
    [xml]$xml = [Text.Encoding]::UTF8.GetString($payloads[$resource.path]).TrimStart([char]0xFEFF)
    foreach($ability in $abilities) { if(!($xml.Abilities.Ability | Where-Object { $_.Id -eq $ability.id })) { throw "Missing $($resource.language) description: $($ability.id)" } }
  }
  foreach ($path in $payloads.Keys) { [IO.File]::WriteAllBytes((Join-Path $output $path),$payloads[$path]) }
  $prior = @($manifest.resources | Where-Object { $_.plugin -eq $plugin })
  foreach($old in $prior) {
    if(!$old.path -or $resources.path -contains $old.path){continue}
    $stale = [IO.Path]::GetFullPath((Join-Path $output $old.path))
    if(!$stale.StartsWith($output + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Resource path outside editor snapshot'}
    if((Test-Path -LiteralPath $stale) -and (Get-FileHash -LiteralPath $stale).Hash.ToLowerInvariant() -eq $old.sha256){Remove-Item -LiteralPath $stale}
  }
  $metadata = @{plugin=$plugin;version=$version;source='project';sourceProject=$projectPath;sourceFiles=$sourceHashes}
  $manifest.resources = @($manifest.resources | Where-Object { $_.plugin -ne $plugin }) + $resources
  $manifest.assemblies = @($manifest.assemblies | Where-Object { $_.plugin -ne $plugin }) + $metadata
  $catalog.abilities = @($catalog.abilities | Where-Object { $_.plugin -ne $plugin }) + $abilities
  $catalog.plugins = @($catalog.plugins | Where-Object { $_.plugin -ne $plugin }) + ($metadata + @{scripts=@($abilities.id);references=@($projectXml.Project.ItemGroup.Reference | ForEach-Object {$_.Include})})
  [IO.File]::WriteAllText($manifestPath,($manifest | ConvertTo-Json -Depth 10),[Text.UTF8Encoding]::new($false))
  [IO.File]::WriteAllText($abilityPath,($catalog | ConvertTo-Json -Depth 10),[Text.UTF8Encoding]::new($false))
  "Imported $plugin $version from project: $($abilities.Count) abilities, $($resources.Count) resources"
} finally { $sha.Dispose() }
