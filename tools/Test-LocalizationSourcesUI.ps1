param([ValidateSet('sources','annotations','groups','cardlabels')][string]$Suite = 'sources')
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$run = Join-Path ([IO.Path]::GetTempPath()) ('RuinaSources-' + [Guid]::NewGuid().ToString('N'))
$mod = Join-Path $run 'mod'
function Fixture($relative, $xml) {
  $path = Join-Path $mod $relative
  [IO.Directory]::CreateDirectory((Split-Path $path -Parent)) | Out-Null
  [IO.File]::WriteAllText($path, $xml)
}
Fixture 'Data/CardInfo.xml' '<DiceCardXmlRoot><Card ID="9"><Name>Base</Name><Script>SplitOnly</Script></Card></DiceCardXmlRoot>'
foreach ($language in 'cn','en') {
  $dir = "Assemblies/Localize/$language"
  Fixture "$dir/BattleCardAbilities/Hat_Alpha.xml" "<BattleCardAbilityDescRoot><!--A--><BattleCardAbility ID='Shared'><Desc>A-$language</Desc></BattleCardAbility></BattleCardAbilityDescRoot>"
  Fixture "$dir/BattleCardAbilities/Beta_cn.xml" "<BattleCardAbilityDescRoot><!--B--><BattleCardAbility ID='Shared'><Desc>B-$language</Desc><Extension keep='yes'/></BattleCardAbility><BattleCardAbility ID='SplitOnly'><Desc>(~HatKeyword id=&quot;Hat_Enchantments_Throughout_Dice_Keyword&quot;/~) $language</Desc></BattleCardAbility></BattleCardAbilityDescRoot>"
  Fixture "$dir/BattlesCards/One.xml" '<BattleCardDescRoot><cardDescList/></BattleCardDescRoot>'
  Fixture "$dir/BattlesCards/Two.xml" "<BattleCardDescRoot><cardDescList><BattleCardDesc ID='9'><LocalizedName>Second-$language</LocalizedName></BattleCardDesc></cardDescList></BattleCardDescRoot>"
  foreach ($file in 'Red','Blue') {
    Fixture "$dir/EffectTexts/$file.xml" "<BattleEffectTextRootExtra><!--$file--><extraTextList><BattleEffectTextExtra ID='SharedRule'><Name>$file-$language</Name><Desc>rule</Desc><Future keep='yes'/></BattleEffectTextExtra></extraTextList></BattleEffectTextRootExtra>"
  }
}
if ($Suite -eq 'cardlabels') {
  $imageDir = Join-Path $mod 'Resource/CombatPageArtwork'
  [IO.Directory]::CreateDirectory($imageDir) | Out-Null
  [IO.File]::WriteAllBytes((Join-Path $imageDir 'ch1_2.png'), [Convert]::FromBase64String('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC'))
  Fixture 'Data/CardInfo.xml' '<DiceCardXmlRoot><Card ID="9"><Name>Test</Name><Option>ExhaustOnUse</Option><Spec Range="FarArea"/></Card><Card ID="10"><Option>ExhaustOnUse</Option><Spec Range="FarAreaEach"/></Card><Card ID="11"><Spec Range="Far"/></Card><Card ID="12"><Name>Vanilla artwork probe</Name><Artwork>ch1_1</Artwork><Script>energy1</Script><BehaviourList><Behaviour Type="Atk" Detail="Hit" Min="2" Dice="4" Script="philip_courage_atk"/></BehaviourList></Card><Card ID="13"><Name>Mod image override</Name><Artwork>ch1_2</Artwork><Script>energy1</Script></Card></DiceCardXmlRoot>'
  foreach ($language in 'jp','kr') {
    Fixture "Assemblies/Localize/$language/BattleCardAbilities/Abilities.xml" '<BattleCardAbilityDescRoot><BattleCardAbility ID="Example"><Desc>Test</Desc></BattleCardAbility></BattleCardAbilityDescRoot>'
  }
}
if ($Suite -eq 'groups') {
  Fixture 'Assemblies/Localize/cn/BattleCardAbilities/Gamma.xml' '<BattleCardAbilityDescRoot><BattleCardAbility ID="ThirdOnly"><Desc>third source</Desc></BattleCardAbility></BattleCardAbilityDescRoot>'
  Fixture 'Assemblies/Localize/cn/EffectTexts/Red.xml' '<BattleEffectTextRootExtra><effectTextList><BattleEffectText ID="PlainOnly"><Name>Plain</Name></BattleEffectText></effectTextList><extraTextList><BattleEffectTextExtra ID="MoveRule"><Name>Rule</Name><Future keep="yes"/></BattleEffectTextExtra></extraTextList></BattleEffectTextRootExtra>'
  Fixture 'Data/CardInfo.xml' '<DiceCardXmlRoot><!--one file--><Card ID="9"><Name>Base</Name></Card><Card ID="21"><Name>Second</Name></Card><Card ID="30"><Name>Third</Name></Card><Card ID="32"><Name>Fourth</Name></Card></DiceCardXmlRoot>'
  Fixture 'Assemblies/Localize/cn/BattleCardAbilities/Beta_cn.xml' '<BattleCardAbilityDescRoot><!--B--><BattleCardAbility ID="Shared"><Desc>B-cn</Desc></BattleCardAbility><BattleCardAbility ID="SplitOnly" custom="yes"><Desc>move</Desc><!--inside--><Extension keep="yes"/></BattleCardAbility></BattleCardAbilityDescRoot>'
}
if ($Suite -eq 'annotations') {
  $other = Join-Path ($mod + '-other') 'Data'
  [IO.Directory]::CreateDirectory($other) | Out-Null
  Copy-Item -LiteralPath (Join-Path $mod 'Data/CardInfo.xml') -Destination $other
  $longId = 'DreamUniverse_FullStopOffice_AdditionalLightOnTheNextScene_Ability'
  foreach ($faction in 'FullStopOffice','Index') {
    Fixture "Assemblies/Localize/cn/BattleCardAbilities/Hat_BattleCardAbilities_cn__$faction.xml" "<BattleCardAbilityDescRoot><BattleCardAbility ID='$longId'><Desc>$faction</Desc></BattleCardAbility></BattleCardAbilityDescRoot>"
  }
  Fixture 'Data/PassiveList.xml' '<PassiveXmlRoot><Passive ID="9"><Name>Passive Nine</Name></Passive></PassiveXmlRoot>'
}
$env:RUINA_SCREENSHOT = Join-Path $run 'verified.png'
$env:RUINA_ERROR_LOG = Join-Path $run 'error.txt'
$env:RUINA_SCREENSHOT_DELAY = '900'
$scriptName = if ($Suite -eq 'annotations') { 'verify-annotations-ui.js' } elseif ($Suite -eq 'groups') { 'verify-groups-ui.js' } elseif ($Suite -eq 'cardlabels') { 'verify-card-labels-ui.js' } else { 'verify-localization-sources-ui.js' }
$env:RUINA_EXEC_JS = 'window.__sourceTestMod = ' + ($mod | ConvertTo-Json -Compress) + ';' + [IO.File]::ReadAllText((Join-Path $PSScriptRoot $scriptName))
$app = Join-Path $repo 'apps/desktop'
function Run-Probe {
$process = Start-Process (Join-Path $app 'node_modules/electron/dist/electron.exe') -ArgumentList @('--disable-gpu','--no-sandbox',('--user-data-dir="'+(Join-Path $run 'profile')+'"'),('"'+$app+'"')) -WindowStyle Hidden -PassThru
if (!$process.WaitForExit(60000)) { throw "Timed out: $run" }
if (Test-Path -LiteralPath $env:RUINA_ERROR_LOG) { throw ([IO.File]::ReadAllText($env:RUINA_ERROR_LOG)) }
if (!(Test-Path -LiteralPath $env:RUINA_SCREENSHOT)) { throw "No completion screenshot: $run" }
}
Run-Probe
if ($Suite -in 'annotations','groups') {
  $env:RUINA_EXEC_JS = 'window.__verifyReload = true;' + $env:RUINA_EXEC_JS
  Run-Probe
}
Get-Content -LiteralPath (Join-Path $run 'result.txt')
