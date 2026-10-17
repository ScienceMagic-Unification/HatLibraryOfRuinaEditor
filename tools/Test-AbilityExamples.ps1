param(
  [string]$GameManaged = 'D:/Program Files (x86)/Steam/steamapps/common/Library Of Ruina/LibraryOfRuina_Data/Managed',
  [string]$Assemblies = 'D:/Program Files (x86)/Steam/steamapps/common/Library Of Ruina/LibraryOfRuina_Data/Mods/梦幻宇宙/Assemblies/1FrameworkAssemblies',
  [string]$Framework = 'C:/Program Files (x86)/Reference Assemblies/Microsoft/Framework/.NETFramework/v4.7.2'
)
$ErrorActionPreference = 'Stop'
$exampleRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../docs/verification/ability-csharp'))
$sdk = @(& dotnet --list-sdks)[-1]
if ($sdk -notmatch '^([^ ]+) \[(.+)\]$') { throw 'No SDK compiler found.' }
$compiler = Join-Path (Join-Path $Matches[2] $Matches[1]) 'Roslyn/bincore/csc.dll'
$refs = @('mscorlib.dll','System.dll','System.Core.dll','System.Xml.dll') | ForEach-Object { '/r:' + (Join-Path $Framework $_) }
$refs += @('Assembly-CSharp.dll','UnityEngine.CoreModule.dll') | ForEach-Object { '/r:' + (Join-Path $GameManaged $_) }
$refs += @('HatSingularity.Enchantments.dll','HatSingularity.Abilities.dll','GameLogicHelperFramework.dll') | ForEach-Object { '/r:' + (Join-Path $Assemblies $_) }
$samples = @(Get-ChildItem -LiteralPath $exampleRoot -Filter '*.cs' | ForEach-Object FullName)
if ($samples.Count -ne 6) { throw 'Run Test-AbilitiesUI.ps1 first to export the six displayed examples.' }
# Compile only. Never load or execute the generated DLL or game/plugin assemblies.
& dotnet $compiler /nologo /langversion:7.3 /nostdlib+ /target:library ('/out:' + (Join-Path $exampleRoot 'Examples.dll')) @refs @samples
if ($LASTEXITCODE -ne 0) { throw 'Example compilation failed.' }
$result = 'PASS: six displayed C# examples compile against the installed Enchantments assembly and framework dependencies.'
[IO.File]::WriteAllText((Join-Path $exampleRoot 'result.txt'), $result, (New-Object System.Text.UTF8Encoding($false)))
$result
