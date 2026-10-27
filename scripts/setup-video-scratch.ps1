param([Parameter(Mandatory = $true)][string]$Identity)
$ErrorActionPreference = 'Stop'
$videoScratch = 'D:\FinOpsVideoTemp'
$videoPrincipal = [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $videoPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Run this script with Windows administrator approval to create the approved video scratch folder.'
}
# Validate the account before creating or granting anything. Scope is fixed to
# the exact folder authorized by the user; no drive-root ACL is modified.
$videoAccount = [Security.Principal.NTAccount]::new($Identity)
$null = $videoAccount.Translate([Security.Principal.SecurityIdentifier])
if (-not (Test-Path -LiteralPath $videoScratch)) {
    New-Item -ItemType Directory -Path $videoScratch | Out-Null
}
$videoDirectory = Get-Item -LiteralPath $videoScratch
if (-not $videoDirectory.PSIsContainer -or ($videoDirectory.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
    throw 'Video scratch must be an ordinary directory, not a link or file.'
}
& icacls.exe $videoScratch /grant "${Identity}:(OI)(CI)M" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Windows did not grant scratch-folder access.' }
Write-Output 'Created the approved video scratch directory and granted Modify access.'
