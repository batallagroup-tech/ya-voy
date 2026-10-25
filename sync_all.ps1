$env:PATH = "C:\Users\Ramses Batalla\AppData\Local\nvm\v24.15.0;" + $env:PATH

$dirs = @(
    "C:\Proyectos\personal\ya-voy\ya-voy-usuario",
    "C:\Proyectos\personal\ya-voy\ya-voy-repartidor",
    "C:\Proyectos\personal\ya-voy\ya-voy-restaurante"
)

foreach ($d in $dirs) {
    Write-Host "Building and syncing in $d..."
    Set-Location $d
    npm run build
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    npx cap sync android
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
Write-Host "All apps built and synced successfully."
