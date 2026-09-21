# Auto Update & Deploy Runner for Gasolineras España
# Se ejecuta a diario para refrescar precios del Ministerio y desplegar a Cloudflare Pages

$ErrorActionPreference = "Stop"
$env:PYTHONIOENCODING = "utf-8"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "⛽ ACTUALIZACIÓN AUTOMÁTICA DE PRECIOS - GASOLINERAS ESPAÑA" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$baseDir = Split-Path -Parent $PSScriptRoot
Set-Location $baseDir

Write-Host "`n1. Consultando API oficial MITECO y procesando 11.400+ gasolineras..." -ForegroundColor Yellow
python scripts/fetch_gasolineras.py

Write-Host "`n2. Compilando páginas estáticas Astro..." -ForegroundColor Yellow
npm run build

Write-Host "`n3. Desplegando en vivo a Cloudflare Pages..." -ForegroundColor Yellow
npx wrangler pages deploy dist --project-name=gasolineras-espana --branch=main --commit-dirty=true

Write-Host "`n✅ ¡Precios actualizados y web desplegada con éxito en https://gasolineras-espana.pages.dev!" -ForegroundColor Green
