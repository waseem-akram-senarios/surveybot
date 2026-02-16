#!/bin/bash

# SurveyBot Setup Script
# This script sets up the SurveyBot system for development or production

set -e

echo "🚀 Setting up SurveyBot System..."
echo "=================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p logs
mkdir -p data/postgres
mkdir -p data/redis
mkdir -p recordings

# Set permissions
chmod 755 logs data recordings

# Copy environment file if it doesn't exist
if [ ! -f "itcurves_deploy/.env" ]; then
    echo "📝 Creating environment file..."
    cp itcurves_deploy/.env.example itcurves_deploy/.env 2>/dev/null || echo "⚠️  Please create itcurves_deploy/.env manually"
    echo "⚠️  Please update itcurves_deploy/.env with your API keys and configuration"
fi

# Build and start services
echo "🐳 Building and starting Docker services..."
cd itcurves_deploy

# Stop existing services
docker-compose down

# Build images
echo "🔨 Building Docker images..."
docker-compose build

# Start services
echo "▶️  Starting services..."
docker-compose up -d

# Wait for services to start
echo "⏱️  Waiting for services to start..."
sleep 30

# Check service health
echo "🔍 Checking service health..."
services=(
    "gateway:8081"
    "dashboard:8080"
    "recipient:3000"
    "agent-service:8050"
    "template-service:8040"
    "survey-service:8020"
    "question-service:8030"
)

all_healthy=true

for service in "${services[@]}"; do
    IFS=':' read -r service_name port <<< "$service"
    if curl -f -s "http://localhost:$port" > /dev/null; then
        echo "✅ $service_name is healthy"
    else
        echo "❌ $service_name is not responding"
        all_healthy=false
    fi
done

if [ "$all_healthy" = true ]; then
    echo ""
    echo "🎉 SurveyBot setup completed successfully!"
    echo ""
    echo "📱 Access your applications:"
    echo "  • Dashboard: http://localhost:8080"
    echo "  • Recipient App: http://localhost:3000"
    echo "  • Backend API: http://localhost:8081/pg"
    echo ""
    echo "🔧 To run tests:"
    echo "  python tests/test_voice_survey_e2e.py"
    echo ""
    echo "📊 To view logs:"
    echo "  cd itcurves_deploy && docker-compose logs -f"
    echo ""
    echo "🛑 To stop services:"
    echo "  cd itcurves_deploy && docker-compose down"
else
    echo ""
    echo "⚠️  Some services are not healthy. Check the logs:"
    echo "  cd itcurves_deploy && docker-compose logs"
fi

echo ""
echo "🏁 Setup script completed"
