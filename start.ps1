Write-Host "================================================" -ForegroundColor Cyan
Write-Host "      Restaurant Management System" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$port = 5000
$backendPath = ".\backend\app.py"

Write-Host "[1/3] Checking and releasing port $port..." -ForegroundColor Yellow
try {
    $process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    if ($process) {
        $pid = $process.OwningProcess
        Write-Host "  Port $port is in use, PID: $pid" -ForegroundColor Red
        try {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-Host "  Port $port released" -ForegroundColor Green
        } catch {
            Write-Host "  Failed to release port: $_" -ForegroundColor Red
        }
    } else {
        Write-Host "  Port $port is available" -ForegroundColor Green
    }
} catch {
    Write-Host "  Port check failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "[2/3] Starting backend service..." -ForegroundColor Yellow

$pythonPath = (Get-Command python -ErrorAction SilentlyContinue).Source
if (-not $pythonPath) {
    $pythonPath = (Get-Command python3 -ErrorAction SilentlyContinue).Source
}
if (-not $pythonPath) {
    Write-Host "  Error: Python not found" -ForegroundColor Red
    Write-Host "  Please install Python and add to PATH" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "  Python path: $pythonPath" -ForegroundColor Gray

Start-Process -FilePath $pythonPath -ArgumentList "app.py" -WorkingDirectory ".\backend" -NoNewWindow -PassThru

Write-Host ""
Write-Host "[3/3] Service starting..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:$port" -TimeoutSec 5 -ErrorAction SilentlyContinue
    if ($response.StatusCode -eq 200) {
        Write-Host ""
        Write-Host "✅ Service started successfully!" -ForegroundColor Green
        Write-Host "================================================" -ForegroundColor Cyan
        Write-Host "  📊 URL: http://127.0.0.1:$port" -ForegroundColor White
        Write-Host "  🔑 Test Accounts:" -ForegroundColor White
        Write-Host "     - Admin: admin / 123456" -ForegroundColor White
        Write-Host "     - Staff: staff / 123456" -ForegroundColor White
        Write-Host "================================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Press Ctrl+C to stop service" -ForegroundColor Gray
    } else {
        Write-Host "❌ Service start failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Cannot connect to service, check logs" -ForegroundColor Red
}

while ($true) {
    Start-Sleep -Seconds 1
}