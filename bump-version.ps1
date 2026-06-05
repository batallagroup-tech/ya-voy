# bump-version.ps1 — incrementa versionCode en las 3 apps
# Uso: .\bump-version.ps1              (solo sube versionCode)
#      .\bump-version.ps1 -Name "1.1.0" (sube versionCode y cambia versionName)
param(
    [string]$Name = ""
)

$apps = @(
    "ya-voy-usuario\android\app\build.gradle",
    "ya-voy-restaurante-v2\android\app\build.gradle",
    "ya-voy-repartidor-v2\android\app\build.gradle"
)

foreach ($rel in $apps) {
    $path = Join-Path $PSScriptRoot $rel
    $content = Get-Content $path -Raw

    if ($content -match 'versionCode (\d+)') {
        $old = [int]$Matches[1]
        $new = $old + 1
        $content = $content -replace "versionCode $old", "versionCode $new"
        Write-Host "$rel : versionCode $old -> $new"
    }

    if ($Name -ne "" -and $content -match 'versionName "([^"]+)"') {
        $content = $content -replace 'versionName "[^"]+"', "versionName `"$Name`""
        Write-Host "$rel : versionName -> $Name"
    }

    Set-Content $path $content -NoNewline
}

Write-Host "Listo. Ahora reconstruye las apps con el script de build."
