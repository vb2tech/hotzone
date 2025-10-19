#!/bin/bash

# Hotzone Frontend Setup Script
echo "🚀 Setting up Hotzone Frontend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file from template..."
    cp env.example .env
    echo "⚠️  Please edit .env file with your Supabase credentials:"
    echo "   - VITE_SUPABASE_URL=your-supabase-url"
    echo "   - VITE_SUPABASE_ANON_KEY=your-supabase-anon-key"
    echo ""
    echo "🔗 Get these from your Supabase project settings > API"
fi

# Create database schema if needed
echo "🗄️  Database schema requirements:"
echo "   Make sure your Supabase database has the following tables:"
echo "   - zones (id, name, description, created_at, updated_at)"
echo "   - containers (id, name, description, zone_id, created_at, updated_at)"
echo "   - items (id, name, description, container_id, item_type, created_at, updated_at)"
echo "   - items can have additional fields for cards/comics"
echo ""

# Build the project
echo "🔨 Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🎉 Setup complete! You can now:"
    echo "   • Run 'npm run dev' to start development server"
    echo "   • Run 'docker-compose up -d' to start with Docker"
    echo "   • Visit http://localhost:3000 to view the app"
    echo ""
    echo "📚 Next steps:"
    echo "   1. Configure your Supabase credentials in .env"
    echo "   2. Set up your database schema in Supabase"
    echo "   3. Create your first zone, container, and items!"
else
    echo "❌ Build failed. Please check the errors above."
    exit 1
fi
