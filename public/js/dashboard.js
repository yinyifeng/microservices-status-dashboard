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
    setupAddServiceModal();
    setupSettingsModal();
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

// Add Service Modal Functions
function setupAddServiceModal() {
  const modal = document.getElementById('add-service-modal');
  const addServiceBtn = document.getElementById('add-service-btn');
  const closeBtn = document.getElementById('modal-close');
  const cancelBtn = document.getElementById('cancel-btn');
  const form = document.getElementById('add-service-form');
  
  // Open modal
  if (addServiceBtn) {
    addServiceBtn.addEventListener('click', () => {
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
    });
  }
  
  // Close modal
  function closeModal() {
    modal.classList.remove('show');
    document.body.style.overflow = '';
    form.reset();
    hideFormError();
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }
  
  if (cancelBtn) {
    cancelBtn.addEventListener('click', closeModal);
  }
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('show')) {
      closeModal();
    }
  });
  
  // Handle form submission
  if (form) {
    form.addEventListener('submit', handleAddService);
  }
}

async function handleAddService(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = form.querySelector('.btn-submit');
  const formData = new FormData(form);
  
  // Get form values
  const serviceData = {
    name: formData.get('name'),
    endpoint: formData.get('endpoint'),
    type: formData.get('type') || 'internal',
    category: formData.get('category') || 'core',
    pollInterval: formData.get('pollInterval') ? parseInt(formData.get('pollInterval')) : undefined,
    criticalService: formData.get('criticalService') === 'on',
    metadata: {}
  };
  
  // Add location to metadata if provided
  const location = formData.get('location');
  if (location) {
    serviceData.metadata.location = location;
  }
  
  // Disable submit button
  submitBtn.disabled = true;
  submitBtn.textContent = 'Adding...';
  hideFormError();
  
  try {
    const response = await fetch(`${API_BASE_URL}/config/service`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(serviceData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to add service');
    }
    
    // Success - reload services and close modal
    await loadServices();
    renderDashboard();
    
    // Close modal
    const modal = document.getElementById('add-service-modal');
    modal.classList.remove('show');
    document.body.style.overflow = '';
    form.reset();
    
    // Show success message (optional - could add a toast notification)
    console.log('Service added successfully:', data.service);
    
  } catch (error) {
    console.error('Error adding service:', error);
    showFormError(error.message || 'Failed to add service. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add Service';
  }
}

function showFormError(message) {
  const errorEl = document.getElementById('form-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
}

function hideFormError() {
  const errorEl = document.getElementById('form-error');
  if (errorEl) {
    errorEl.style.display = 'none';
    errorEl.textContent = '';
  }
}

// Settings Modal Functions
function setupSettingsModal() {
  const modal = document.getElementById('settings-modal');
  const settingsBtn = document.getElementById('settings-btn');
  const closeBtn = document.getElementById('settings-modal-close');
  
  // Open modal
  if (settingsBtn) {
    settingsBtn.addEventListener('click', async () => {
      modal.classList.add('show');
      document.body.style.overflow = 'hidden';
      await loadServicesList();
    });
  }
  
  // Close modal
  function closeModal() {
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
  }
  
  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('show')) {
      closeModal();
    }
  });
}

async function loadServicesList() {
  const servicesListEl = document.getElementById('services-list');
  
  try {
    const response = await fetch(`${API_BASE_URL}/config/services`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    const services = data.services || [];
    
    if (services.length === 0) {
      servicesListEl.innerHTML = '<div class="service-item-empty">No services configured</div>';
      return;
    }
    
    servicesListEl.innerHTML = services.map(service => createServiceListItem(service)).join('');
    
    // Attach delete handlers
    services.forEach(service => {
      const deleteBtn = document.getElementById(`delete-btn-${service.id}`);
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => handleDeleteService(service));
      }
    });
    
  } catch (error) {
    console.error('Error loading services list:', error);
    servicesListEl.innerHTML = `<div class="service-item-empty" style="color: var(--color-down);">Error loading services: ${error.message}</div>`;
  }
}

function createServiceListItem(service) {
  const typeBadge = `<span class="service-item-badge badge-${service.type}">${service.type}</span>`;
  const criticalBadge = service.criticalService ? '<span class="service-item-badge badge-critical">Critical</span>' : '';
  
  return `
    <div class="service-item" id="service-item-${service.id}">
      <div class="service-item-info">
        <div class="service-item-name">${escapeHtml(service.name)}</div>
        <div class="service-item-details">
          <div class="service-item-detail">
            <strong>Endpoint:</strong> ${escapeHtml(service.endpoint)}
          </div>
          <div class="service-item-detail">
            <strong>Category:</strong> ${escapeHtml(service.category)}
          </div>
          <div class="service-item-detail">
            <strong>Poll Interval:</strong> ${service.pollInterval}s
          </div>
          <div class="service-item-detail">
            ${typeBadge}${criticalBadge}
          </div>
        </div>
        <div class="delete-confirmation" id="confirm-delete-${service.id}">
          <p>Are you sure you want to delete "${escapeHtml(service.name)}"?</p>
          <div class="delete-confirmation-actions">
            <button class="btn-cancel-delete" onclick="cancelDelete('${service.id}')">Cancel</button>
            <button class="btn-confirm-delete" onclick="confirmDelete('${service.id}')">Delete</button>
          </div>
        </div>
      </div>
      <div class="service-item-actions">
        <button class="btn-delete" id="delete-btn-${service.id}" aria-label="Delete service">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
          Delete
        </button>
      </div>
    </div>
  `;
}

function handleDeleteService(service) {
  const confirmEl = document.getElementById(`confirm-delete-${service.id}`);
  const deleteBtn = document.getElementById(`delete-btn-${service.id}`);
  
  // Hide all other confirmations
  document.querySelectorAll('.delete-confirmation').forEach(el => {
    if (el.id !== `confirm-delete-${service.id}`) {
      el.classList.remove('show');
    }
  });
  
  // Toggle this confirmation
  if (confirmEl) {
    confirmEl.classList.toggle('show');
  }
  
  if (deleteBtn) {
    deleteBtn.disabled = confirmEl?.classList.contains('show');
  }
}

async function confirmDelete(serviceId) {
  const deleteBtn = document.getElementById(`delete-btn-${serviceId}`);
  const confirmEl = document.getElementById(`confirm-delete-${serviceId}`);
  
  if (deleteBtn) {
    deleteBtn.disabled = true;
    deleteBtn.textContent = 'Deleting...';
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/config/service/${serviceId}`, {
      method: 'DELETE'
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete service');
    }
    
    // Remove the service item from the list
    const serviceItem = document.getElementById(`service-item-${serviceId}`);
    if (serviceItem) {
      serviceItem.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => {
        serviceItem.remove();
        
        // Reload services list to update count
        loadServicesList();
        
        // Reload dashboard
        loadServices().then(() => {
          renderDashboard();
        });
      }, 300);
    }
    
  } catch (error) {
    console.error('Error deleting service:', error);
    alert(`Failed to delete service: ${error.message}`);
    
    if (deleteBtn) {
      deleteBtn.disabled = false;
      deleteBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
        Delete
      `;
    }
    
    if (confirmEl) {
      confirmEl.classList.remove('show');
    }
  }
}

function cancelDelete(serviceId) {
  const confirmEl = document.getElementById(`confirm-delete-${serviceId}`);
  const deleteBtn = document.getElementById(`delete-btn-${serviceId}`);
  
  if (confirmEl) {
    confirmEl.classList.remove('show');
  }
  
  if (deleteBtn) {
    deleteBtn.disabled = false;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Make cancelDelete and confirmDelete available globally for onclick handlers
window.cancelDelete = cancelDelete;
window.confirmDelete = confirmDelete;

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
