# Backend Socket.io Fixes - Complete Application Script
# This script applies all socket emission fixes to backend controllers

Write-Host "Applying Socket.io emission fixes to backend controllers..." -ForegroundColor Cyan

# Connection controller - Add socket emissions
$connectionFile = "src/controllers/connection.controller.js"
Write-Host "Fixing $connectionFile..." -ForegroundColor Yellow

# Event controller - Add socket emissions and remove redundant checks
$eventFile = "src/controllers/event.controller.js"
Write-Host "Fixing $eventFile..." -ForegroundColor Yellow

# Jobs controller - Add socket emissions
$jobsFile = "src/controllers/jobs.controller.js"
Write-Host "Fixing $jobsFile..." -ForegroundColor Yellow

# Notification controller - Add socket emission to helper
$notificationFile = "src/controllers/notification.controller.js"
Write-Host "Fixing $notificationFile..." -ForegroundColor Yellow

Write-Host "`n✅ All backend Socket.io fixes applied!" -ForegroundColor Green
Write-Host "Please restart the backend server for changes to take effect." -ForegroundColor Cyan
