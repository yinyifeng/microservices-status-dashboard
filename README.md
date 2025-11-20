# Microservices Status Dashboard

Real-time monitoring dashboard for displaying the health status of company microservices on TV monitors.

## Project Structure

```
microservices-status-dashboard/
├── backend/
│   ├── routes/
│   │   ├── status.js         # Status API endpoints
│   │   └── config.js          # Configuration reload endpoint
│   ├── services/
│   │   └── healthCheck.js     # Health check polling service
│   └── server.js              # Main server file
├── config/
│   └── services.json          # Service configuration
├── public/
│   ├── css/
│   │   └── styles.css         # Dashboard styles
│   ├── js/
│   │   └── dashboard.js       # Frontend logic
│   └── index.html             # Dashboard UI
├── .env.example               # Environment variables template
├── .gitignore
├── package.json
├── microservice-monitor-design-plan.md
└── README.md
```

## Features

- 🟢 Real-time service health monitoring
- 🎨 Color-coded status indicators (Green/Yellow/Red)
- 📊 Live dashboard with auto-refresh
- 🔌 WebSocket support for instant updates
- ⚙️ JSON-based configuration
- 📺 TV-optimized display design
- 🔄 Configurable polling intervals

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Configure your services in `config/services.json`

### Running the Application

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3000`

## Configuration

### Service Configuration (`config/services.json`)

Add or modify services in the configuration file:

```json
{
  "id": "your-service",
  "name": "Your Service Name",
  "endpoint": "https://your-service.com/health",
  "type": "internal|hardware|third-party",
  "category": "core|production|operations",
  "pollInterval": 30,
  "criticalService": true,
  "metadata": {
    "location": "Optional location",
    "productType": "Optional type"
  }
}
```

### Environment Variables (`.env`)

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode
- `CORS_ORIGIN` - CORS allowed origins
- `CONFIG_PATH` - Path to services configuration

## API Endpoints

### GET `/api/status`
Returns the current status of all services with summary statistics.

### GET `/api/status/:serviceId`
Returns detailed status for a specific service.

### POST `/api/config/reload`
Reloads the service configuration without restarting the server.

## Status Indicators

- **🟢 Green (Healthy)**: Response time < 2s, HTTP 200
- **🟡 Yellow (Warning)**: Response time 2-5s, degraded performance
- **🔴 Red (Down)**: Timeout, HTTP 500+, unreachable

## Adding New Services

1. Edit `config/services.json`
2. Add new service object with required parameters
3. Reload configuration:
   ```bash
   curl -X POST http://localhost:3000/api/config/reload
   ```
4. Service automatically appears on dashboard

## TV Display Setup

1. Open Chrome/Firefox in kiosk mode
2. Navigate to `http://your-server:3000`
3. Enable auto-start on boot
4. Disable sleep/screensaver

## Development

The project uses:
- **Backend**: Node.js + Express
- **Frontend**: Vanilla JavaScript (no frameworks)
- **Real-time**: Socket.IO for live updates
- **Configuration**: JSON-based service management

## Next Steps

1. ✅ Project structure created
2. ⏳ Install dependencies (`npm install`)
3. ⏳ Configure actual service endpoints
4. ⏳ Test with mock/real services
5. ⏳ Deploy to production
6. ⏳ Configure TV monitors

## License

ISC
