@echo off
setlocal enabledelayedexpansion

:: Default values
set REGISTRY=localhost
set TAG=latest
set PUSH=false

:: Parse command line arguments
:parse_args
if "%~1"=="" goto :end_parse_args
if /i "%~1"=="-r" (
    set REGISTRY=%~2
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="--registry" (
    set REGISTRY=%~2
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="-t" (
    set TAG=%~2
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="--tag" (
    set TAG=%~2
    shift
    shift
    goto :parse_args
)
if /i "%~1"=="-p" (
    set PUSH=true
    shift
    goto :parse_args
)
if /i "%~1"=="--push" (
    set PUSH=true
    shift
    goto :parse_args
)
if /i "%~1"=="-h" (
    goto :show_help
)
if /i "%~1"=="--help" (
    goto :show_help
)
echo Unknown option: %~1
goto :show_help

:end_parse_args

:: Display build information
echo =====================================
echo Building Docker Images
echo =====================================
echo Registry: %REGISTRY%
echo Tag: %TAG%
echo Push: %PUSH%
echo =====================================

:: Build frontend image
echo Building frontend image...
docker build -t %REGISTRY%/sqlchat-frontend:%TAG% .

:: Build R server image
echo Building R server image...
docker build -t %REGISTRY%/sqlchat-r-server:%TAG% ./r-server

:: Note about n8n
echo Note: n8n uses the official image from Docker Hub (n8nio/n8n)

:: Push images if requested
if "%PUSH%"=="true" (
    echo Pushing images to registry...
    docker push %REGISTRY%/sqlchat-frontend:%TAG%
    docker push %REGISTRY%/sqlchat-r-server:%TAG%
    echo Note: n8n image is not pushed as we use the official image
)

echo =====================================
echo Build completed successfully!
echo =====================================

if "%PUSH%"=="true" (
    echo Images pushed to registry: %REGISTRY%
) else (
    echo To push images to registry, run with --push flag
)

echo To use these images, run:
echo set DOCKER_REGISTRY=%REGISTRY%
echo set TAG=%TAG%
echo docker-compose -f docker-compose.prod.yml up -d

goto :eof

:show_help
echo Usage: %0 [options]
echo Options:
echo   -r, --registry REGISTRY   Docker registry to push to (default: localhost)
echo   -t, --tag TAG             Tag for the images (default: latest)
echo   -p, --push                Push images to registry
echo   -h, --help                Display this help message
echo.
echo Example:
echo   %0 --registry myregistry.com --tag v1.0.0 --push
exit /b 0 