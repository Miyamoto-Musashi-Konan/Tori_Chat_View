# Copy-Item script to move the generated ToriChat logo to the project root
$src = "C:\Users\mdwin\.gemini\antigravity-ide\brain\5a32fbef-0c40-4525-a251-273017e7c304\torichat_logo_1782575110677.png"
$dest = "C:\Users\mdwin\Downloads\99_Vibe_Coding\kakao_Analyze\torichat_logo.png"

if (Test-Path $src) {
    Copy-Item $src $dest -Force
    Write-Host "Success: torichat_logo.png has been copied successfully!" -ForegroundColor Green
} else {
    Write-Warning "Source image not found in the original directory."
}
