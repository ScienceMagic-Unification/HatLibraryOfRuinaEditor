param([string]$BaseMod = 'D:/Program Files (x86)/Steam/steamapps/common/Library Of Ruina/LibraryOfRuina_Data/Managed/BaseMod')
$ErrorActionPreference = 'Stop'
$entries = @{}
$sources = [Collections.Generic.List[object]]::new()
foreach ($lang in @('cn', 'en', 'jp')) {
  foreach ($spec in @(@('PassiveDesc','PassiveDesc','passive','Name'), @('BattleCardAbilities','BattleCardAbility','ability','Name'), @('BattlesCards','BattleCardDesc','card','LocalizedName'))) {
    foreach ($file in Get-ChildItem -LiteralPath "$BaseMod/Localize/$lang/$($spec[0])" -File | Sort-Object Name) {
      [xml]$xml = [IO.File]::ReadAllText($file.FullName)
      $sources.Add(@{path=$file.FullName.Substring($BaseMod.Length+1).Replace('\','/'); sha256=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash})
      foreach ($node in $xml.GetElementsByTagName($spec[1])) {
        $id=$node.GetAttribute('ID'); $key="$($spec[2]):$id"
        if (!$entries.ContainsKey($key)) { $entries[$key]=@{id=$id;kind=$spec[2];text=@{};fields=@{}} }
        $nameNode=$node.SelectSingleNode($spec[3]); $descs=@($node.SelectNodes('Desc') | ForEach-Object { $_.InnerText })
        $entries[$key].text[$lang]=@{name=$(if($nameNode){$nameNode.InnerText}else{''});desc=($descs -join "`n")}
      }
    }
  }
}
foreach ($file in Get-ChildItem -LiteralPath "$BaseMod/StaticInfo/PassiveList" -File | Sort-Object Name) {
  [xml]$xml=[IO.File]::ReadAllText($file.FullName)
  $sources.Add(@{path=$file.FullName.Substring($BaseMod.Length+1).Replace('\','/');sha256=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash})
  foreach ($node in $xml.GetElementsByTagName('Passive')) {
    $id=$node.GetAttribute('ID');$key="passive:$id"
    if (!$entries.ContainsKey($key)) {$entries[$key]=@{id=$id;kind='passive';text=@{};fields=@{}}}
    foreach ($child in $node.ChildNodes) {if($child.NodeType -eq 'Element'){$entries[$key].fields[$child.Name]=$child.InnerText}}
  }
}
foreach ($file in Get-ChildItem -LiteralPath "$BaseMod/StaticInfo/Card" -File | Sort-Object Name) {
  [xml]$xml=[IO.File]::ReadAllText($file.FullName)
  $sources.Add(@{path=$file.FullName.Substring($BaseMod.Length+1).Replace('\','/');sha256=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash})
  foreach ($node in $xml.GetElementsByTagName('Card')) {
    $id=$node.GetAttribute('ID');$key="card:$id"
    if (!$entries.ContainsKey($key)) {$entries[$key]=@{id=$id;kind='card';text=@{};fields=@{}}}
    $entries[$key].xml=$node.OuterXml
  }
}
$output=Join-Path $PSScriptRoot '../apps/desktop/src/renderer/src/assets/vanilla-abilities.json'
$data=@{sources=@($sources);entries=@($entries.Values | Sort-Object kind, id)}
[IO.File]::WriteAllText([IO.Path]::GetFullPath($output), ($data | ConvertTo-Json -Depth 12), [Text.UTF8Encoding]::new($false))
$entries.Values | Group-Object kind | Select-Object Name,Count
