const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Проверка наличия директорий
const ensureDirectories = () => {
  const dirs = [
    path.join(__dirname, 'scripts'),
    path.join(__dirname, 'public/outputs')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  });
};

// Установка зависимостей
const installDependencies = () => {
  try {
    console.log('Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
    console.log('Dependencies installed successfully.');
  } catch (error) {
    console.error('Failed to install dependencies:', error.message);
    process.exit(1);
  }
};

// Проверка наличия R
const checkR = () => {
  try {
    console.log('Checking R installation...');
    execSync('Rscript --version', { stdio: 'inherit' });
    console.log('R is installed.');
  } catch (error) {
    console.error('R is not installed or not in PATH. Please install R and try again.');
    console.error('Visit https://cran.r-project.org/ for installation instructions.');
    process.exit(1);
  }
};

// Проверка наличия ggplot2
const checkGgplot2 = () => {
  try {
    console.log('Checking ggplot2 installation...');
    execSync('Rscript -e "library(ggplot2)"', { stdio: 'inherit' });
    console.log('ggplot2 is installed.');
  } catch (error) {
    console.error('ggplot2 is not installed. Attempting to install...');
    try {
      execSync('Rscript -e "install.packages(\'ggplot2\', repos=\'https://cloud.r-project.org\')"', { stdio: 'inherit' });
      console.log('ggplot2 installed successfully.');
    } catch (installError) {
      console.error('Failed to install ggplot2:', installError.message);
      console.error('Please install ggplot2 manually by running R and executing: install.packages("ggplot2")');
      process.exit(1);
    }
  }
};

// Проверка наличия gt
const checkGt = () => {
  try {
    console.log('Checking gt package installation...');
    execSync('Rscript -e "library(gt)"', { stdio: 'inherit' });
    console.log('gt package is installed.');
  } catch (error) {
    console.error('gt package is not installed. Attempting to install...');
    try {
      execSync('Rscript -e "install.packages(\'gt\', repos=\'https://cloud.r-project.org\')"', { stdio: 'inherit' });
      console.log('gt package installed successfully.');
    } catch (installError) {
      console.error('Failed to install gt package:', installError.message);
      console.error('Please install gt manually by running R and executing: install.packages("gt")');
      console.warn('The server will still work without gt, but gt tables will not be supported.');
    }
  }
};

// Запуск сервера
const startServer = () => {
  try {
    console.log('Starting server...');
    execSync('npm start', { stdio: 'inherit' });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

// Запуск всех проверок и установок
const main = () => {
  console.log('Setting up R Script Server...');
  ensureDirectories();
  installDependencies();
  checkR();
  checkGgplot2();
  checkGt();
  console.log('Setup complete. You can now start the server with: npm start');
  
  // Раскомментируйте следующую строку, если хотите автоматически запустить сервер после установки
  // startServer();
};

main(); 