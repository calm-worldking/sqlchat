@echo off
setlocal enabledelayedexpansion

:: Display header
echo =====================================
echo SQL Chat Docker Setup and Run Script
echo =====================================
echo.

:: Check if Docker is installed
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Docker is not installed. Please install Docker first.
    pause
    exit /b 1
)

:: Check if Docker Compose is installed
where docker-compose >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Error: Docker Compose is not installed. Please install Docker Compose first.
    pause
    exit /b 1
)

:menu
cls
echo Please select an option:
echo 1. Build and start containers
echo 2. Start existing containers
echo 3. Stop containers
echo 4. View logs
echo 5. Rebuild containers
echo 6. Remove containers and volumes
echo 7. Open n8n interface in browser
echo 8. Configure n8n settings
echo 0. Exit
echo.

set /p choice=Enter your choice: 

if "%choice%"=="1" (
    echo Building and starting containers...
    docker-compose up -d --build
    echo Containers are now running!
    echo You can access the application at http://localhost:3000
    echo You can access n8n at http://localhost:5678
    goto end
)

if "%choice%"=="2" (
    echo Starting existing containers...
    docker-compose up -d
    echo Containers are now running!
    echo You can access the application at http://localhost:3000
    echo You can access n8n at http://localhost:5678
    goto end
)

if "%choice%"=="3" (
    echo Stopping containers...
    docker-compose down
    echo Containers stopped.
    goto end
)

if "%choice%"=="4" (
    echo Viewing logs (press Ctrl+C to exit)...
    docker-compose logs -f
    goto end
)

if "%choice%"=="5" (
    echo Rebuilding containers...
    docker-compose down
    docker-compose build --no-cache
    docker-compose up -d
    echo Containers rebuilt and started!
    echo You can access the application at http://localhost:3000
    echo You can access n8n at http://localhost:5678
    goto end
)

if "%choice%"=="6" (
    echo This will remove all containers and volumes. Data will be lost!
    set /p confirm=Are you sure? (y/n): 
    if /i "!confirm!"=="y" (
        docker-compose down -v
        echo Containers and volumes removed.
    ) else (
        echo Operation cancelled.
    )
    goto end
)

if "%choice%"=="7" (
    echo Opening n8n interface in browser...
    start http://localhost:5678
    goto end
)

if "%choice%"=="8" (
    call :configure_n8n
    goto end
)

if "%choice%"=="0" (
    echo Exiting...
    exit /b 0
)

echo Invalid option. Please try again.

:end
echo.
pause
goto menu

:configure_n8n
echo Configuring n8n settings...

:: Generate a random encryption key if needed
set chars=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789
set key=
for /L %%i in (1,1,32) do call :add_char
goto :key_generated

:add_char
set /a rand=%random% %% 62
set key=!key!!chars:~%rand%,1!
goto :eof

:key_generated
set /p input_key=Enter n8n encryption key (leave empty to use !key!): 
if "!input_key!"=="" (
    set encryption_key=!key!
) else (
    set encryption_key=!input_key!
)

set /p webhook_url=Enter n8n webhook URL (leave empty for http://localhost:5678/): 
if "!webhook_url!"=="" (
    set webhook_url=http://localhost:5678/
)

set /p timezone=Enter timezone (leave empty for Europe/Moscow): 
if "!timezone!"=="" (
    set timezone=Europe/Moscow
)

:: Update docker-compose.yml
powershell -Command "(Get-Content docker-compose.yml) -replace 'N8N_ENCRYPTION_KEY=.*', 'N8N_ENCRYPTION_KEY=!encryption_key!' | Set-Content docker-compose.yml"
powershell -Command "(Get-Content docker-compose.yml) -replace 'WEBHOOK_URL=.*', 'WEBHOOK_URL=!webhook_url!' | Set-Content docker-compose.yml"
powershell -Command "(Get-Content docker-compose.yml) -replace 'GENERIC_TIMEZONE=.*', 'GENERIC_TIMEZONE=!timezone!' | Set-Content docker-compose.yml"

echo n8n configuration updated successfully!
echo Encryption key: !encryption_key!
echo Webhook URL: !webhook_url!
echo Timezone: !timezone!
echo.
echo Remember to restart the containers for changes to take effect.
goto :eof 