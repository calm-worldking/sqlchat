#!/bin/bash

# Ensure script is executable
chmod +x setup-docker.sh

# Display header
echo "====================================="
echo "SQL Chat Docker Setup and Run Script"
echo "====================================="
echo

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Error: Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Function to display menu
show_menu() {
    echo "Please select an option:"
    echo "1. Build and start containers"
    echo "2. Start existing containers"
    echo "3. Stop containers"
    echo "4. View logs"
    echo "5. Rebuild containers"
    echo "6. Remove containers and volumes"
    echo "7. Open n8n interface in browser"
    echo "8. Configure n8n settings"
    echo "0. Exit"
    echo
    read -p "Enter your choice: " choice
}

# Function to open browser
open_browser() {
    url=$1
    if command -v xdg-open &> /dev/null; then
        xdg-open "$url"
    elif command -v open &> /dev/null; then
        open "$url"
    elif command -v start &> /dev/null; then
        start "$url"
    else
        echo "Cannot open browser automatically. Please open $url manually."
    fi
}

# Function to configure n8n
configure_n8n() {
    echo "Configuring n8n settings..."
    
    # Get current encryption key or generate a new one
    current_key=$(grep "N8N_ENCRYPTION_KEY" docker-compose.yml | cut -d ":" -f2 | tr -d " ")
    if [ "$current_key" == "your-encryption-key-here" ] || [ -z "$current_key" ]; then
        # Generate a random encryption key
        new_key=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    else
        new_key=$current_key
    fi
    
    read -p "Enter n8n encryption key (leave empty to use $new_key): " input_key
    encryption_key=${input_key:-$new_key}
    
    read -p "Enter n8n webhook URL (leave empty for http://localhost:5678/): " webhook_url
    webhook_url=${webhook_url:-"http://localhost:5678/"}
    
    read -p "Enter timezone (leave empty for Europe/Moscow): " timezone
    timezone=${timezone:-"Europe/Moscow"}
    
    # Update docker-compose.yml
    sed -i "s|N8N_ENCRYPTION_KEY=.*|N8N_ENCRYPTION_KEY=$encryption_key|g" docker-compose.yml
    sed -i "s|WEBHOOK_URL=.*|WEBHOOK_URL=$webhook_url|g" docker-compose.yml
    sed -i "s|GENERIC_TIMEZONE=.*|GENERIC_TIMEZONE=$timezone|g" docker-compose.yml
    
    echo "n8n configuration updated successfully!"
    echo "Encryption key: $encryption_key"
    echo "Webhook URL: $webhook_url"
    echo "Timezone: $timezone"
    echo
    echo "Remember to restart the containers for changes to take effect."
}

# Main loop
while true; do
    show_menu

    case $choice in
        1)
            echo "Building and starting containers..."
            docker-compose up -d --build
            echo "Containers are now running!"
            echo "You can access the application at http://localhost:3000"
            echo "You can access n8n at http://localhost:5678"
            ;;
        2)
            echo "Starting existing containers..."
            docker-compose up -d
            echo "Containers are now running!"
            echo "You can access the application at http://localhost:3000"
            echo "You can access n8n at http://localhost:5678"
            ;;
        3)
            echo "Stopping containers..."
            docker-compose down
            echo "Containers stopped."
            ;;
        4)
            echo "Viewing logs (press Ctrl+C to exit)..."
            docker-compose logs -f
            ;;
        5)
            echo "Rebuilding containers..."
            docker-compose down
            docker-compose build --no-cache
            docker-compose up -d
            echo "Containers rebuilt and started!"
            echo "You can access the application at http://localhost:3000"
            echo "You can access n8n at http://localhost:5678"
            ;;
        6)
            echo "This will remove all containers and volumes. Data will be lost!"
            read -p "Are you sure? (y/n): " confirm
            if [[ $confirm == [Yy] ]]; then
                docker-compose down -v
                echo "Containers and volumes removed."
            else
                echo "Operation cancelled."
            fi
            ;;
        7)
            echo "Opening n8n interface in browser..."
            open_browser "http://localhost:5678"
            ;;
        8)
            configure_n8n
            ;;
        0)
            echo "Exiting..."
            exit 0
            ;;
        *)
            echo "Invalid option. Please try again."
            ;;
    esac

    echo
    read -p "Press Enter to continue..."
    clear
done 