$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:PATH = "$env:JAVA_HOME\bin;" + $env:PATH

$apps = @(
    @{ Name = "ya-voy-usuario"; Path = "C:\Proyectos\personal\ya-voy\ya-voy-usuario\android"; Output = "C:\Proyectos\personal\ya-voy\ya-voy-usuario\android\app\build\outputs\bundle\release\app-release.aab"; Dest = "C:\Users\Ramses Batalla\AppData\Local\Temp\ya-voy-usuario-release.aab" },
    @{ Name = "ya-voy-repartidor"; Path = "C:\Proyectos\personal\ya-voy\ya-voy-repartidor\android"; Output = "C:\Proyectos\personal\ya-voy\ya-voy-repartidor\android\app\build\outputs\bundle\release\app-release.aab"; Dest = "C:\Users\Ramses Batalla\AppData\Local\Temp\ya-voy-repartidor-release.aab" },
    @{ Name = "ya-voy-restaurante"; Path = "C:\Proyectos\personal\ya-voy\ya-voy-restaurante\android"; Output = "C:\Proyectos\personal\ya-voy\ya-voy-restaurante\android\app\build\outputs\bundle\release\app-release.aab"; Dest = "C:\Users\Ramses Batalla\AppData\Local\Temp\ya-voy-restaurante-release.aab" }
)

foreach ($app in $apps) {
    Write-Host "=========================================="
    Write-Host "Compilando $($app.Name)..."
    Write-Host "=========================================="
    Set-Location $app.Path
    .\gradlew.bat bundleRelease
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Fallo la compilacion de $($app.Name)"
        exit $LASTEXITCODE
    }
    Copy-Item -Path $app.Output -Destination $app.Dest -Force
    Write-Host "Exito! Copiado $($app.Name) a $($app.Dest)"
}

Write-Host "Todas las 3 aplicaciones fueron compiladas a AAB con exito."
