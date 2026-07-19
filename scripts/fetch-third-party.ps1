$ErrorActionPreference = 'Stop'

$shaderUrl = 'https://cdn.modrinth.com/data/R6NEzAwj/versions/VMHXIk50/ComplementaryUnbound_r5.8.1.zip'
$shaderSize = 546928
$shaderSha512 = '9098dd9e0c18b80f7aba2839cea33ce9a614d97665bbfcac87ccce6e4771667c41602d99088852cb1642ccab20b2ceff9b98af8f2e795bd0d3b90b7c9cbab914'
$shaderPath = Join-Path $PSScriptRoot '..\pack\servers\NewPlay-1.21.4\files\shaderpacks\ComplementaryUnbound_r5.8.1.zip'

function Test-ShaderFile {
    if (-not (Test-Path -LiteralPath $shaderPath -PathType Leaf)) {
        return $false
    }
    $file = Get-Item -LiteralPath $shaderPath
    $hash = (Get-FileHash -LiteralPath $shaderPath -Algorithm SHA512).Hash.ToLowerInvariant()
    return $file.Length -eq $shaderSize -and $hash -eq $shaderSha512
}

if (Test-ShaderFile) {
    Write-Host 'Complementary Unbound r5.8.1 is already verified.'
    exit 0
}

New-Item -ItemType Directory -Path (Split-Path -Parent $shaderPath) -Force | Out-Null
try {
    Invoke-WebRequest -Uri $shaderUrl -OutFile $shaderPath
    if (-not (Test-ShaderFile)) {
        throw 'Complementary Unbound size or SHA-512 verification failed.'
    }
} catch {
    Remove-Item -LiteralPath $shaderPath -Force -ErrorAction SilentlyContinue
    throw
}

Write-Host 'Complementary Unbound r5.8.1 downloaded and verified.'
