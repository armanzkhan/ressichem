# Clear Next.js cache and restart dev server
Write-Host "Clearing Next.js cache..." -ForegroundColor Yellow

# Remove .next folder if it exists
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "✅ Cleared .next cache folder" -ForegroundColor Green
} else {
    Write-Host "ℹ️  .next folder not found (this is okay)" -ForegroundColor Cyan
}

# Remove node_modules/.cache if it exists
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache"
    Write-Host "✅ Cleared node_modules cache" -ForegroundColor Green
}

Write-Host ""
Write-Host "Cache cleared! Now restart your dev server with: npm run dev" -ForegroundColor Green

