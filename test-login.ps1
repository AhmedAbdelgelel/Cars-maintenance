# PowerShell script to test login endpoints

Write-Host "Testing Login Endpoints..." -ForegroundColor Green

# Test receiver login with email
Write-Host "`n1. Testing Receiver Login (Email):" -ForegroundColor Yellow
$receiverLoginEmail = @{
    email = "receiver@example.com"
    role = "receiver"
} | ConvertTo-Json

Write-Host "Request:" -ForegroundColor Cyan
Write-Host $receiverLoginEmail

# Test receiver login with phone
Write-Host "`n2. Testing Receiver Login (Phone):" -ForegroundColor Yellow
$receiverLoginPhone = @{
    phoneNumber = "+1234567890"
    role = "receiver"
} | ConvertTo-Json

Write-Host "Request:" -ForegroundColor Cyan
Write-Host $receiverLoginPhone

# Test driver login
Write-Host "`n3. Testing Driver Login:" -ForegroundColor Yellow
$driverLogin = @{
    phoneNumber = "+1234567890"
    role = "driver"
} | ConvertTo-Json

Write-Host "Request:" -ForegroundColor Cyan
Write-Host $driverLogin

Write-Host "`n" -ForegroundColor Green
Write-Host "To test against your server, use:" -ForegroundColor White
Write-Host "Invoke-WebRequest -Uri 'http://localhost:3000/api/auth/login' -Method POST -Body `$receiverLoginEmail -ContentType 'application/json'" -ForegroundColor Gray

Write-Host "`nNote: UTF-8 encoding is used by default - DO NOT change this!" -ForegroundColor Red
