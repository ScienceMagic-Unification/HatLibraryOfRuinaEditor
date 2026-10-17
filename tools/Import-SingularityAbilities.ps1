param(
    [string]$Assemblies = 'D:/Program Files (x86)/Steam/steamapps/common/Library Of Ruina/LibraryOfRuina_Data/Mods/梦幻宇宙/Assemblies/1FrameworkAssemblies',
    [string]$Dnlib = 'D:/软件/dnSpy6.1.8/bin/dnlib.dll'
)
$ErrorActionPreference = 'Stop'
Add-Type -Path $Dnlib
$plugins = @()
$abilities = @()
foreach ($file in Get-ChildItem -LiteralPath $Assemblies -Filter 'HatSingularity*.dll' | Sort-Object Name) {
    $module = [dnlib.DotNet.ModuleDefMD]::Load($file.FullName)
    try {
        $ids = @()
        foreach ($type in $module.GetTypes()) {
            if (!$type.IsPublic -or $type.IsAbstract -or $type.HasGenericParameters -or $type.Name -notmatch '^DiceCard(Self)?Ability_(.+)$') { continue }
            $kind = if ($Matches[1]) {'card'} else {'dice'}
            $id = $Matches[2]
            if (!($type.Methods | Where-Object {$_.IsInstanceConstructor -and $_.IsPublic -and $_.MethodSig.Params.Count -eq 0})) { continue }
            $ids += $id
            $abilities += @{id=$id; kind=$kind; type=$type.FullName; plugin=$file.BaseName; version=$module.Assembly.Version.ToString()}
        }
        $plugins += @{plugin=$file.BaseName; version=$module.Assembly.Version.ToString(); sha256=(Get-FileHash -LiteralPath $file.FullName).Hash.ToLowerInvariant(); scripts=$ids; references=@($module.GetAssemblyRefs() | ForEach-Object {$_.Name.ToString()})}
    } finally { $module.Dispose() }
}
$path = Join-Path $PSScriptRoot '../apps/desktop/src/renderer/src/assets/abilities-manifest.json'
[IO.File]::WriteAllText([IO.Path]::GetFullPath($path), (@{plugins=$plugins; abilities=$abilities} | ConvertTo-Json -Depth 8), [Text.UTF8Encoding]::new($false))
$abilities | Select-Object id,kind,version
