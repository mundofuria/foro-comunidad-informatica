@echo off
title Panel de pantalla FoCo - no cerrar
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0servidor.ps1"
if errorlevel 1 pause
