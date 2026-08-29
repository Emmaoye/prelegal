$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

$ImageName = "prelegal"
$ContainerName = "prelegal"
$Port = if ($env:PORT) { $env:PORT } else { "8000" }

Write-Host "Building Docker image..."
docker build -t $ImageName .

$existing = docker ps -a --format "{{.Names}}" | Select-String -Pattern "^$ContainerName$"
if ($existing) {
    Write-Host "Removing existing container..."
    docker rm -f $ContainerName | Out-Null
}

$envArgs = @()
if (Test-Path ".env") {
    $envArgs = @("--env-file", ".env")
}

Write-Host "Starting container..."
docker run -d --name $ContainerName -p "${Port}:8000" @envArgs $ImageName | Out-Null

Write-Host "Waiting for backend to become healthy..."
for ($i = 0; $i -lt 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$Port/api/health" -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            Write-Host "Prelegal is running at http://localhost:$Port"
            exit 0
        }
    } catch {
        Start-Sleep -Seconds 1
    }
}

Write-Host "Prelegal did not become healthy in time. Check logs with: docker logs $ContainerName"
exit 1
