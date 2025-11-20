// Configuration
const API_BASE_URL = window.location.origin + '/api';
let socket;
let services = [];

// Initialize dashboard
async function init() {
  try {
    initializeTheme();
    initializeView();
    await loadServices();
    renderDashboard();
    setupSocketConnection();
    setupPolling();
    setupThemeToggle();
    setupViewToggle();
    setupRefreshButton();
  } catch (error) {
    console.error('Initialization error:', error);
    showError('Failed to initialize dashboard');
  }
}

// Theme Management
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
}

function setupThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
  }
}

// View Management
function initializeView() {
  const savedView = localStorage.getItem('view') || 'grid';
  document.documentElement.setAttribute('data-view', savedView);
}

function toggleView() {
  const currentView = document.documentElement.getAttribute('data-view');
  let newView;
  
  // Cycle through: grid -> list -> list-2col -> grid
  switch(currentView) {
    case 'grid':
      newView = 'list';
      break;
    case 'list':
      newView = 'list-2col';
      break;
    case 'list-2col':
      newView = 'grid';
      break;
    default:
      newView = 'grid';
  }
  
  document.documentElement.setAttribute('data-view', newView);
  localStorage.setItem('view', newView);
}

function setupViewToggle() {
  const viewToggle = document.getElementById('view-toggle');
  if (viewToggle) {
    viewToggle.addEventListener('click', toggleView);
  }
}

// Load service statuses from API
async function loadServices() {
  try {
    const response = await fetch(`${API_BASE_URL}/status`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    services = data.services || [];
    
    return data;
  } catch (error) {
    console.error('Error loading services:', error);
    throw error;
  }
}

// Setup Socket.IO connection for real-time updates
function setupSocketConnection() {
  socket = io();
  
  socket.on('connect', () => {
    console.log('Connected to server via WebSocket');
  });
  
  socket.on('status-update', (data) => {
    console.log('Received status update:', data);
    services = data.services || [];
    updateDashboard();
  });
  
  socket.on('disconnect', () => {
    console.log('Disconnected from server');
  });
  
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
}

// Setup polling as fallback
function setupPolling() {
  setInterval(async () => {
    try {
      await loadServices();
      updateDashboard();
    } catch (error) {
      console.error('Polling error:', error);
    }
  }, 30000); // Poll every 30 seconds as fallback
}

// Render the entire dashboard
function renderDashboard() {
  const container = document.getElementById('dashboard-container');
  container.innerHTML = '';
  
  if (services.length === 0) {
    container.innerHTML = '<div class="loading">No services configured</div>';
    return;
  }
  
  services.forEach(service => {
    const tile = createServiceTile(service);
    container.appendChild(tile);
  });
  
  updateSummary();
  updateTimestamp();
}

// Create individual service tile
function createServiceTile(service) {
  const tile = document.createElement('div');
  tile.className = `service-tile status-${service.status}`;
  tile.id = `service-${service.id}`;
  
  const metadata = service.metadata ? 
    `<div class="service-metadata">${service.metadata.location || ''}</div>` : '';
  
  tile.innerHTML = `
    <h2>${service.name}</h2>
    <div class="status-indicator"></div>
    <div class="service-info">
      <p class="response-time">${service.responseTime}ms</p>
      ${metadata}
      <p class="error-message">${service.message || ''}</p>
    </div>
  `;
  
  return tile;
}

// Update existing dashboard tiles
function updateDashboard() {
  services.forEach(service => {
    const tile = document.getElementById(`service-${service.id}`);
    
    if (tile) {
      // Update class for status
      tile.className = `service-tile status-${service.status}`;
      
      // Update response time
      const responseTimeEl = tile.querySelector('.response-time');
      if (responseTimeEl) {
        responseTimeEl.textContent = `${service.responseTime}ms`;
      }
      
      // Update error message
      const errorMessageEl = tile.querySelector('.error-message');
      if (errorMessageEl) {
        errorMessageEl.textContent = service.message || '';
      }
    } else {
      // Service doesn't exist, re-render entire dashboard
      renderDashboard();
      return;
    }
  });
  
  updateSummary();
  updateTimestamp();
}

// Update summary statistics
function updateSummary() {
  const healthyCount = services.filter(s => s.status === 'healthy').length;
  const warningCount = services.filter(s => s.status === 'warning').length;
  const downCount = services.filter(s => s.status === 'down').length;
  
  document.getElementById('healthy-count').textContent = healthyCount;
  document.getElementById('warning-count').textContent = warningCount;
  document.getElementById('down-count').textContent = downCount;
}

// Update timestamp
function updateTimestamp() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
  document.getElementById('last-update').textContent = `Last updated: ${timeString}`;
}

// Show error message
function showError(message) {
  const container = document.getElementById('dashboard-container');
  container.innerHTML = `<div class="loading" style="color: var(--color-down);">${message}</div>`;
}

// Manual Refresh
let isRefreshing = false;

async function manualRefresh() {
  if (isRefreshing) return;
  
  const refreshBtn = document.getElementById('refresh-btn');
  
  try {
    // Set refreshing state
    isRefreshing = true;
    refreshBtn.classList.add('refreshing');
    
    // Load fresh data
    await loadServices();
    updateDashboard();
    
    // Keep spinning for at least 500ms for visual feedback
    await new Promise(resolve => setTimeout(resolve, 500));
    
  } catch (error) {
    console.error('Manual refresh error:', error);
  } finally {
    // Reset refreshing state
    refreshBtn.classList.remove('refreshing');
    
    // Add cooldown to prevent spam (1 second)
    setTimeout(() => {
      isRefreshing = false;
    }, 1000);
  }
}

function setupRefreshButton() {
  const refreshBtn = document.getElementById('refresh-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', manualRefresh);
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
