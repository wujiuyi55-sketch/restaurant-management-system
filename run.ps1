$script:port = 5000
$script:backendDir = ".\backend"
$script:pidFile = ".\backend.pid"

function Release-Port {
    param([int]$port)
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($conns) {
            $pids = @()
            if ($conns -is [array]) {
                $pids = $conns | ForEach-Object { $_.OwningProcess } | Select-Object -Unique
            } else {
                $pids = @($conns.OwningProcess)
            }
            foreach ($targetPid in $pids) {
                if ($targetPid -gt 0) {
                    Write-Host "Port $port is in use by PID $targetPid, releasing..." -ForegroundColor Yellow
                    try {
                        Stop-Process -Id $targetPid -Force -ErrorAction SilentlyContinue
                        Write-Host "PID $targetPid stopped" -ForegroundColor Green
                    } catch {
                        Write-Host "Failed to stop PID $targetPid" -ForegroundColor Red
                    }
                }
            }
            Start-Sleep -Seconds 1
            Write-Host "Port $port released" -ForegroundColor Green
        } else {
            Write-Host "Port $port is available" -ForegroundColor Green
        }
    } catch {
        Write-Host "Port check error: $_" -ForegroundColor Red
    }
}

function Start-Backend {
    Write-Host "`n[$(Get-Date -Format 'HH:mm:ss')] Starting backend service..." -ForegroundColor Yellow
    
    $python = (Get-Command python -ErrorAction SilentlyContinue).Source
    if (-not $python) {
        $python = (Get-Command python3 -ErrorAction SilentlyContinue).Source
    }
    if (-not $python) {
        Write-Host "Error: Python not found" -ForegroundColor Red
        Write-Host "Please install Python and add it to PATH" -ForegroundColor Red
        return $null
    }
    
    Write-Host "Python path: $python" -ForegroundColor Gray
    
    $proc = Start-Process -FilePath $python -ArgumentList "app.py" -WorkingDirectory $backendDir -NoNewWindow -PassThru
    
    if ($proc) {
        $proc.Id | Out-File -FilePath $pidFile -Encoding utf8
        Write-Host "Service started with PID: $($proc.Id)" -ForegroundColor Green
        return $proc.Id
    }
    
    return $null
}

function Wait-For-Service {
    param([int]$port, [int]$timeout = 10)
    Write-Host "Waiting for service to respond..." -ForegroundColor Yellow
    
    for ($i = 0; $i -lt $timeout; $i++) {
        Start-Sleep -Seconds 1
        try {
            $response = Invoke-WebRequest -Uri "http://127.0.0.1:$port" -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($response.StatusCode -eq 200) {
                return $true
            }
        } catch {
            # Service not ready yet
        }
        Write-Host -NoNewline "." -ForegroundColor Gray
    }
    
    Write-Host ""
    return $false
}

function Stop-Backend {
    if (Test-Path $pidFile) {
        $content = Get-Content $pidFile -Raw
        if ($content -match '^\d+$') {
            $storedPid = [int]$matches[0]
            try {
                Stop-Process -Id $storedPid -Force -ErrorAction SilentlyContinue
                Write-Host "Service stopped (PID: $storedPid)" -ForegroundColor Green
            } catch {
                Write-Host "Failed to stop service" -ForegroundColor Red
            }
        }
        Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "        Restaurant Management System" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

Stop-Backend

Release-Port -port $port

$servicePid = Start-Backend

if (-not $servicePid) {
    exit 1
}

if (Wait-For-Service -port $port) {
    Write-Host ""
    Write-Host "================================================" -ForegroundColor Green
    Write-Host "Service started successfully!" -ForegroundColor Green
    Write-Host "URL: http://127.0.0.1:$port" -ForegroundColor White
    Write-Host "Test accounts:" -ForegroundColor White
    Write-Host "  - Admin: admin / 123456" -ForegroundColor White
    Write-Host "  - Staff: staff / 123456" -ForegroundColor White
    Write-Host "================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Press Ctrl+C to stop the service" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "Service failed to start" -ForegroundColor Red
    Stop-Backend
    exit 1
}

try {
    while ($true) {
        if (-not (Get-Process -Id $servicePid -ErrorAction SilentlyContinue)) {
            Write-Host "Service process has exited" -ForegroundColor Yellow
            break
        }
        Start-Sleep -Seconds 2
    }
} finally {
    Stop-Backend
}