# Keep the rest of CoreReady's translations while taking these entries from the
# Core XML that matches the installed KeywordView and Abilities assemblies.
function Merge-EnglishExhaustionTerms([string]$BaseFile, [string]$CoreFile, [string[]]$Ids) {
  $xml = [Xml.XmlDocument]::new()
  $xml.PreserveWhitespace = $true
  $xml.Load($BaseFile)
  $core = [Xml.XmlDocument]::new()
  $core.PreserveWhitespace = $true
  $core.Load($CoreFile)
  foreach ($id in $Ids) {
    $query = "//*[@ID='$id' or @id='$id']"
    $before = $xml.SelectSingleNode($query)
    $after = $core.SelectSingleNode($query)
    if (!$before -or !$after) { throw "Missing exhaustion term: $id" }
    [void]$before.ParentNode.ReplaceChild($xml.ImportNode($after, $true), $before)
  }
  return ,([Text.UTF8Encoding]::new($false).GetBytes($xml.OuterXml))
}
