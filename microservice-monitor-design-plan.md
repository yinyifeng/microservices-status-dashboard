# Microservice Monitoring Dashboard - Design Plan & Documentation

## Project Overview

A real-time monitoring dashboard for displaying the health status of company microservices on TV monitors. The system will provide immediate visual feedback on service health using color-coded indicators (green, yellow, red) with concise error messaging for quick issue identification and resolution.

### Primary Users
- TNB Production team
- Wayfong.com operations team
- Development and IT staff

### Display Environment
- TV monitors mounted outside mentor's office
- No touchscreen or mouse interaction
- Multiple monitors for comprehensive visibility

---

## System Architecture

### Technology Stack

**Frontend:**
- HTML5
- CSS3
- Vanilla JavaScript (no frameworks)

**Backend:**
- Node.js
- Express.js (for API endpoints)

**Real-time Communication:**
- Socket.IO (for scale weight data streaming)
- HTTP polling (for service health checks)

**Configuration:**
- JSON configuration file for service management

---

## Services to Monitor

### Internal Services
1. **Catalog API** (wayfong.com)
   - Product listing endpoints
   - Search functionality
   - Database connections

2. **Scale Systems** (TMB Production)
   - Station 1: [Meat type/cut]
   - Station 2: [Meat type/cut]
   - Station 3: [Meat type/cut]
   - Station 4: [Meat type/cut]
   - Station 5: [Meat type/cut]
   - Function: Live weight measurement for inventory and quality assurance

### Third-Party Integrations
3. **Geotab** (Fleet Management)
4. **Maintain X** (Maintenance Operations)

### Future Services
- Extensible architecture for adding additional microservices as needed

---

## Status Indicator System

### Color Codes
- **Green**: Service is healthy and operational
- **Yellow**: Warning state - service has issues but is operational
- **Red**: Service is down or non-responsive

### Status Criteria

**Green (Healthy):**
- Response time < 2 seconds
- HTTP 200 status code
- All health check endpoints passing

**Yellow (Warning):**
- Response time 2-5 seconds
- Degraded performance detected
- Non-critical errors present
- Partial functionality available

**Red (Down):**
- No response or timeout
- HTTP 500+ error codes
- Service unreachable
- Critical failure detected

---

## Error Messaging System

### Design Requirements
- Concise 2-4 word messages
- Displayed directly on service tiles
- No interaction required to view
- Standardized error codes for team familiarity

### Example Error Messages
- "DB Timeout"
- "High Latency"
- "Connection Failed"
- "API Unavailable"
- "Auth Error"
- "Rate Limited"
- "Partial Outage"
- "Scale Offline"

---

## Configuration File Structure

```json
{
  "services": [
    {
      "id": "catalog-api",
      "name": "Catalog API",
      "endpoint": "https://api.wayfong.com/health",
      "type": "internal",
      "category": "core",
      "pollInterval": 30,
      "criticalService": true
    },
    {
      "id": "scale-station-1",
      "name": "Scale Station 1",
      "endpoint": "https://scales.tmbproduction.com/station1/status",
      "type": "hardware",
      "category": "production",
      "pollInterval": 30,
      "criticalService": true,
      "metadata": {
        "location": "Station 1",
        "productType": "Beef cuts"
      }
    },
    {
      "id": "geotab",
      "name": "Geotab Fleet",
      "endpoint": "https://api.geotab.com/health",
      "type": "third-party",
      "category": "operations",
      "pollInterval": 120,
      "criticalService": false
    },
    {
      "id": "maintainx",
      "name": "Maintain X",
      "endpoint": "https://api.getmaintainx.com/status",
      "type": "third-party",
      "category": "operations",
      "pollInterval": 120,
      "criticalService": false
    }
  ],
  "settings": {
    "defaultPollInterval": 60,
    "criticalPollInterval": 30,
    "normalPollInterval": 120,
    "timeoutThreshold": 5000,
    "warningThreshold": 2000
  }
}
```

### Configuration Parameters

- **id**: Unique identifier for the service
- **name**: Display name on dashboard
- **endpoint**: Health check URL
- **type**: Service classification (internal, hardware, third-party)
- **category**: Grouping for dashboard organization
- **pollInterval**: Check frequency in seconds
- **criticalService**: Priority flag for monitoring
- **metadata**: Additional service-specific information

---

## Polling Strategy

### Interval Recommendations

**Critical Services (30-60 seconds):**
- Catalog API
- All 5 Scale Stations
- Core production systems

**Normal Services (2-3 minutes):**
- Geotab
- Maintain X
- Non-critical integrations

### Implementation Approach

1. **Staggered Polling**: Distribute health checks to avoid simultaneous requests
2. **Priority-based**: Check critical services more frequently
3. **Timeout Handling**: 5-second timeout for unresponsive services
4. **Retry Logic**: Single retry on failure before marking as down

---

## Backend API Design

### Node.js Health Check Service

#### Endpoints

**1. GET /api/status**
- Returns current status of all services
- Response format:
```json
{
  "timestamp": "2025-11-19T14:30:00Z",
  "services": [
    {
      "id": "catalog-api",
      "name": "Catalog API",
      "status": "healthy",
      "responseTime": 145,
      "lastChecked": "2025-11-19T14:29:55Z",
      "message": null
    },
    {
      "id": "scale-station-3",
      "name": "Scale Station 3",
      "status": "warning",
      "responseTime": 3200,
      "lastChecked": "2025-11-19T14:29:50Z",
      "message": "High Latency"
    }
  ]
}
```

**2. GET /api/status/:serviceId**
- Returns detailed status for specific service
- Includes historical data if needed

**3. POST /api/config/reload**
- Reloads configuration file
- Allows adding services without restart

#### Health Check Logic

```javascript
async function checkServiceHealth(service) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(service.endpoint, {
      timeout: 5000,
      method: 'GET'
    });
    
    const responseTime = Date.now() - startTime;
    
    // Determine status based on response
    let status = 'healthy';
    let message = null;
    
    if (!response.ok) {
      status = 'down';
      message = `HTTP ${response.status}`;
    } else if (responseTime > 5000) {
      status = 'down';
      message = 'Timeout';
    } else if (responseTime > 2000) {
      status = 'warning';
      message = 'High Latency';
    }
    
    return {
      id: service.id,
      name: service.name,
      status: status,
      responseTime: responseTime,
      lastChecked: new Date().toISOString(),
      message: message
    };
    
  } catch (error) {
    return {
      id: service.id,
      name: service.name,
      status: 'down',
      responseTime: Date.now() - startTime,
      lastChecked: new Date().toISOString(),
      message: 'Connection Failed'
    };
  }
}
```

---

## Frontend Dashboard Design

### HTML Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Service Monitoring Dashboard</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header>
    <h1>Microservice Status Monitor</h1>
    <div id="last-update">Last updated: --:--:--</div>
  </header>
  
  <main id="dashboard-container">
    <!-- Service tiles will be dynamically generated here -->
  </main>
  
  <footer>
    <div id="summary">
      <span class="stat">Healthy: <span id="healthy-count">0</span></span>
      <span class="stat">Warning: <span id="warning-count">0</span></span>
      <span class="stat">Down: <span id="down-count">0</span></span>
    </div>
  </footer>
  
  <script src="dashboard.js"></script>
</body>
</html>
```

### CSS Styling Approach

**Key Design Principles:**
- Large, readable text for TV monitor viewing
- High contrast colors
- Grid layout for service tiles
- Responsive to different monitor sizes
- Clean, minimal design

**Color Palette:**
- Healthy Green: #2ECC71
- Warning Yellow: #F39C12
- Down Red: #E74C3C
- Background: #1E1E1E (dark theme)
- Text: #FFFFFF

### JavaScript Implementation

**Core Functionality:**

1. **Load Configuration**: Fetch service config on page load
2. **Generate Tiles**: Dynamically create service display elements
3. **Poll Services**: Regular interval checking via backend API
4. **Update Display**: Real-time status updates
5. **Handle Errors**: Graceful degradation if backend is down

**Sample Code Structure:**

```javascript
// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
let services = [];

// Initialize dashboard
async function init() {
  await loadServices();
  renderDashboard();
  startPolling();
}

// Load service configuration
async function loadServices() {
  const response = await fetch(`${API_BASE_URL}/status`);
  const data = await response.json();
  services = data.services;
}

// Render service tiles
function renderDashboard() {
  const container = document.getElementById('dashboard-container');
  container.innerHTML = '';
  
  services.forEach(service => {
    const tile = createServiceTile(service);
    container.appendChild(tile);
  });
}

// Create individual service tile
function createServiceTile(service) {
  const tile = document.createElement('div');
  tile.className = `service-tile status-${service.status}`;
  tile.id = `service-${service.id}`;
  
  tile.innerHTML = `
    <h2>${service.name}</h2>
    <div class="status-indicator"></div>
    <p class="response-time">${service.responseTime}ms</p>
    <p class="error-message">${service.message || ''}</p>
  `;
  
  return tile;
}

// Polling mechanism
function startPolling() {
  setInterval(async () => {
    await loadServices();
    updateDashboard();
  }, 30000); // Poll every 30 seconds
}

// Update existing tiles
function updateDashboard() {
  services.forEach(service => {
    const tile = document.getElementById(`service-${service.id}`);
    if (tile) {
      tile.className = `service-tile status-${service.status}`;
      tile.querySelector('.response-time').textContent = `${service.responseTime}ms`;
      tile.querySelector('.error-message').textContent = service.message || '';
    }
  });
  
  updateSummary();
  updateTimestamp();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
```

---

## Scale System Integration

### Socket.IO Implementation

For real-time weight data streaming from the five scale stations:

**Backend Socket Server:**
```javascript
const io = require('socket.io')(server);

// Connect to scale hardware
io.on('connection', (socket) => {
  console.log('Dashboard connected');
  
  // Stream weight data from all 5 stations
  setInterval(() => {
    socket.emit('scale-data', {
      station1: getScaleWeight(1),
      station2: getScaleWeight(2),
      station3: getScaleWeight(3),
      station4: getScaleWeight(4),
      station5: getScaleWeight(5),
      timestamp: new Date().toISOString()
    });
  }, 1000); // Update every second
});
```

**Note**: Scale weight data is separate from status monitoring. Status only checks if scales are online and responding, not the actual weight values.

---

## Development Phases

### Phase 1: Backend Development (Week 1-2)
- Set up Node.js/Express server
- Create health check endpoints
- Implement polling mechanism
- Build configuration system
- Test with mock services

### Phase 2: Frontend Development (Week 2-3)
- Create HTML structure
- Design CSS styling for TV displays
- Implement JavaScript polling
- Build dynamic tile generation
- Test on actual TV monitors

### Phase 3: Integration & Testing (Week 3-4)
- Connect to real service endpoints
- Integrate scale systems
- Add Geotab and Maintain X
- Load testing and optimization
- Error handling refinement

### Phase 4: Deployment & Monitoring (Week 4)
- Deploy backend service
- Configure TV monitor displays
- Train team on error codes
- Set up logging and alerts
- Create operational documentation

---

## Deployment Considerations

### Server Requirements
- Node.js 18+ environment
- Minimal resource needs (1 CPU, 1GB RAM sufficient)
- Reliable network connectivity
- HTTPS for secure communications

### Frontend Hosting
- Can be served from Node.js backend
- Or deployed to CDN for faster loading
- Auto-refresh capability essential
- Minimal dependencies for reliability

### TV Monitor Setup
- Chrome/Firefox browser in kiosk mode
- Auto-start on boot
- Prevent sleep/screensaver
- Network redundancy recommended

---

## Maintenance & Extensibility

### Adding New Services

1. Edit `config.json` file
2. Add new service object with required parameters
3. Reload configuration via API or restart
4. Service automatically appears on dashboard

### Updating Error Messages

Maintain consistency by using standardized error code dictionary. Update both backend error detection logic and team documentation simultaneously.

### Performance Optimization

- Cache service status for quick dashboard loads
- Implement connection pooling for frequent checks
- Use CDN for static assets
- Monitor backend performance metrics

---

## Success Metrics

### Key Performance Indicators
- Dashboard uptime: 99.9%
- Status update latency: < 5 seconds
- False positive rate: < 1%
- Team issue response time: Reduction by 50%

### User Acceptance Criteria
- All services visible at a glance
- Error messages immediately actionable
- No interaction required for information
- Readable from 10+ feet away

---

## Future Enhancements

### Potential Features
- Historical status tracking and graphs
- Email/SMS alerts for critical failures
- Mobile app companion
- Advanced analytics dashboard
- Integration with incident management systems
- Automated remediation triggers
- Custom alerting rules per service

---

## Technical Support & Documentation

### Team Training Topics
- Understanding status colors
- Common error message meanings
- When to escalate issues
- Adding new services to monitoring

### Operational Runbooks
- Service fails to respond
- Dashboard displays incorrectly
- Backend server issues
- Scale system connectivity problems

---

## Conclusion

This monitoring dashboard provides TNB Production and Wayfong.com with real-time visibility into critical microservices. The simple, config-driven architecture ensures easy maintenance and extensibility as your infrastructure grows.

**Key Benefits:**
- Immediate issue detection
- Reduced downtime
- Proactive problem resolution
- Team-wide visibility
- Scalable architecture

**Next Steps:**
1. Review and approve design plan
2. Set up development environment
3. Begin Phase 1 backend development
4. Schedule regular check-ins with mentor
5. Plan deployment timeline

---

## Appendix

### A. Service Endpoint Specifications
Document each service's health check endpoint format, authentication requirements, and expected responses.

### B. Error Code Reference Guide
Complete list of all possible error messages with troubleshooting steps.

### C. Configuration File Examples
Sample configurations for various deployment scenarios.

### D. Testing Checklist
Comprehensive testing procedures for each phase.

---

**Document Version**: 1.0  
**Last Updated**: November 19, 2025  
**Author**: Design Planning Session  
**Review Status**: Draft - Pending Mentor Approval
