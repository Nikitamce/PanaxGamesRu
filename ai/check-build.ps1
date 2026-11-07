# Проверка, что dist собран из текущих исходников.
# Запуск: powershell -File ai\check-build.ps1
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

$pkg = (Get-Content -Raw package.json | ConvertFrom-Json).version
$badge = Select-String -Path src\content\main.js -Pattern "PANAX RU (\d+\.\d+\.\d+)" | Select-Object -First 1
$srcVer = $badge.Matches[0].Groups[1].Value
$dist = Select-String -Path dist\content.js -Pattern "PANAX RU (\d+\.\d+\.\d+)" | Select-Object -First 1
if (-not $dist) { Write-Error 'В dist/content.js нет бейджа. Запусти npm run build.'; exit 1 }
$distVer = $dist.Matches[0].Groups[1].Value

Write-Output "package.json $pkg"
Write-Output "src badge   $srcVer"
Write-Output "dist badge  $distVer"
if ($pkg -ne $srcVer -or $srcVer -ne $distVer) {
  Write-Error 'Версии разошлись. Подними все четыре места и снова собери.'
  exit 1
}
Write-Output 'OK'
