FROM rocker/r-ver:4.3.0

# Install system dependencies for R packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    libcurl4-openssl-dev \
    libssl-dev \
    libxml2-dev \
    libcairo2-dev \
    libxt-dev \
    libfontconfig1-dev \
    libharfbuzz-dev \
    libfribidi-dev \
    libfreetype6-dev \
    libpng-dev \
    libtiff5-dev \
    libjpeg-dev \
    libglpk-dev \
    nodejs \
    npm \
    pandoc \
    texlive-latex-base \
    texlive-fonts-recommended \
    texlive-fonts-extra \
    texlive-latex-extra \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install required R packages
RUN R -e "install.packages(c('ggplot2', 'gt', 'jsonlite', 'knitr', 'rmarkdown', 'pdftools', 'extrafont', 'xfun', 'kableExtra', 'dplyr'), repos='https://cloud.r-project.org/')"

# Set up working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install Node.js dependencies
RUN npm ci

# Copy the rest of the application
COPY . .

# Create necessary directories
RUN mkdir -p scripts public/outputs public/tables logs

# Expose port for the R server
EXPOSE 3001

# Command to run the server
CMD ["node", "server.js"] 