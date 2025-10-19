# Hotzone Frontend

A React-based inventory management frontend for the Hotzone system, built with TypeScript, Vite, and Supabase.

## Features

- 🔐 **Authentication**: Email/password login with Supabase Auth
- 📊 **Dashboard**: Overview with counts and recent items
- 🗺️ **Zone Management**: Create, view, and manage storage zones
- 📦 **Container Management**: Organize items within zones
- 🎯 **Items Management**: Track cards and comics
- 🗺️ **Heat Map Visualization**: Interactive zone density visualization
- 🐳 **Docker Support**: Containerized deployment

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **React Router** for navigation
- **Supabase** for backend services
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Docker** for containerization

## Setup

### Prerequisites

- Node.js 18+
- Docker (optional)
- Supabase project with configured database

### Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your-supabase-url-here
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key-here
```

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Docker Deployment

### Build and Run

```bash
# Build the Docker image
docker build -t hotzone-frontend .

# Run the container
docker run -p 3000:80 hotzone-frontend
```

### Using Docker Compose

```bash
# Set environment variables
export VITE_SUPABASE_URL=your-supabase-url
export VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Start the service
docker-compose up -d
```

## Database Schema

The application expects the following Supabase tables:

### Zones
```sql
CREATE TABLE zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Containers
```sql
CREATE TABLE containers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Items
```sql
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  container_id UUID REFERENCES containers(id) ON DELETE CASCADE,
  item_type TEXT CHECK (item_type IN ('card', 'comic')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Dashboard.tsx
│   ├── LoginForm.tsx
│   ├── Navigation.tsx
│   └── ZoneHeatMap.tsx
├── contexts/            # React contexts
│   └── AuthContext.tsx
├── lib/                 # Utilities and configurations
│   └── supabase.ts
├── pages/               # Page components
│   ├── ZonesPage.tsx
│   └── ZoneForm.tsx
├── App.tsx              # Main app component
├── index.css            # Global styles
└── index.ts             # Entry point
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Key Features

1. **Authentication Flow**: Secure login with Supabase Auth
2. **Responsive Design**: Mobile-first approach with Tailwind CSS
3. **Type Safety**: Full TypeScript support
4. **Modern React**: Hooks, context, and functional components
5. **Real-time Updates**: Supabase real-time subscriptions
6. **Interactive Visualizations**: Heat map for zone density

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

UNLICENSED - All rights reserved
