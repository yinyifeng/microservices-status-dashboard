const fs = require('fs');
const path = require('path');

class HealthCheckService {
  constructor() {
    this.services = [];
    this.settings = {};
    this.statusCache = new Map();
    this.pollingIntervals = new Map();
    this.io = null;
  }

  initialize(io) {
    this.io = io;
    this.loadConfiguration();
    this.startPolling();
  }

  loadConfiguration() {
    const configPath = process.env.CONFIG_PATH || path.join(__dirname, '../../config/services.json');
    
    try {
      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);
      
      this.services = config.services;
      this.settings = config.settings;
      
      console.log(`Loaded ${this.services.length} services from configuration`);
    } catch (error) {
      console.error('Error loading configuration:', error.message);
      this.services = [];
      this.settings = {
        timeoutThreshold: 5000,
        warningThreshold: 2000
      };
    }
  }

  async checkServiceHealth(service) {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.settings.timeoutThreshold);
      
      const response = await fetch(service.endpoint, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      const responseTime = Date.now() - startTime;
      
      let status = 'healthy';
      let message = null;
      
      if (!response.ok) {
        status = 'down';
        message = `HTTP ${response.status}`;
      } else if (responseTime > this.settings.timeoutThreshold) {
        status = 'down';
        message = 'Timeout';
      } else if (responseTime > this.settings.warningThreshold) {
        status = 'warning';
        message = 'High Latency';
      }
      
      return {
        id: service.id,
        name: service.name,
        status: status,
        responseTime: responseTime,
        lastChecked: new Date().toISOString(),
        message: message,
        type: service.type,
        category: service.category
      };
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        id: service.id,
        name: service.name,
        status: 'down',
        responseTime: responseTime,
        lastChecked: new Date().toISOString(),
        message: error.name === 'AbortError' ? 'Timeout' : 'Connection Failed',
        type: service.type,
        category: service.category
      };
    }
  }

  async checkAllServices() {
    const checks = this.services.map(service => this.checkServiceHealth(service));
    const results = await Promise.all(checks);
    
    // Update cache
    results.forEach(result => {
      this.statusCache.set(result.id, result);
    });
    
    // Emit to connected clients
    if (this.io) {
      this.io.emit('status-update', {
        timestamp: new Date().toISOString(),
        services: results
      });
    }
    
    return results;
  }

  startPolling() {
    // Group services by poll interval
    const intervalGroups = new Map();
    
    this.services.forEach(service => {
      const interval = service.pollInterval * 1000;
      if (!intervalGroups.has(interval)) {
        intervalGroups.set(interval, []);
      }
      intervalGroups.get(interval).push(service);
    });
    
    // Start polling for each interval group
    intervalGroups.forEach((services, interval) => {
      const pollGroup = async () => {
        const checks = services.map(service => this.checkServiceHealth(service));
        const results = await Promise.all(checks);
        
        results.forEach(result => {
          this.statusCache.set(result.id, result);
        });
        
        if (this.io) {
          this.io.emit('status-update', {
            timestamp: new Date().toISOString(),
            services: Array.from(this.statusCache.values())
          });
        }
      };
      
      // Initial check
      pollGroup();
      
      // Set up interval
      const intervalId = setInterval(pollGroup, interval);
      this.pollingIntervals.set(interval, intervalId);
      
      console.log(`Started polling ${services.length} services every ${interval/1000}s`);
    });
  }

  getAllStatuses() {
    return Array.from(this.statusCache.values());
  }

  getServiceStatus(serviceId) {
    return this.statusCache.get(serviceId);
  }

  reloadConfiguration() {
    // Clear existing intervals
    this.pollingIntervals.forEach(intervalId => clearInterval(intervalId));
    this.pollingIntervals.clear();
    this.statusCache.clear();
    
    // Reload and restart
    this.loadConfiguration();
    this.startPolling();
  }

  addService(serviceData) {
    const configPath = process.env.CONFIG_PATH || path.join(__dirname, '../../config/services.json');
    
    try {
      // Load current config
      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);
      
      // Generate ID if not provided
      if (!serviceData.id) {
        serviceData.id = serviceData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }
      
      // Check if service ID already exists
      if (config.services.some(s => s.id === serviceData.id)) {
        throw new Error(`Service with ID "${serviceData.id}" already exists`);
      }
      
      // Set defaults
      const newService = {
        id: serviceData.id,
        name: serviceData.name,
        endpoint: serviceData.endpoint,
        type: serviceData.type || 'internal',
        category: serviceData.category || 'core',
        pollInterval: serviceData.pollInterval || this.settings.defaultPollInterval || 60,
        criticalService: serviceData.criticalService !== undefined ? serviceData.criticalService : false,
        ...(serviceData.metadata && { metadata: serviceData.metadata })
      };
      
      // Add service to config
      config.services.push(newService);
      
      // Save config file
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      
      // Reload configuration to start polling the new service
      this.reloadConfiguration();
      
      return newService;
    } catch (error) {
      console.error('Error adding service:', error.message);
      throw error;
    }
  }

  deleteService(serviceId) {
    const configPath = process.env.CONFIG_PATH || path.join(__dirname, '../../config/services.json');
    
    try {
      // Load current config
      const configData = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configData);
      
      // Find service index
      const serviceIndex = config.services.findIndex(s => s.id === serviceId);
      
      if (serviceIndex === -1) {
        throw new Error(`Service with ID "${serviceId}" not found`);
      }
      
      // Remove service
      const deletedService = config.services.splice(serviceIndex, 1)[0];
      
      // Save config file
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
      
      // Reload configuration to stop polling the deleted service
      this.reloadConfiguration();
      
      return deletedService;
    } catch (error) {
      console.error('Error deleting service:', error.message);
      throw error;
    }
  }

  getAllServices() {
    return this.services.map(service => ({
      id: service.id,
      name: service.name,
      endpoint: service.endpoint,
      type: service.type,
      category: service.category,
      pollInterval: service.pollInterval,
      criticalService: service.criticalService,
      metadata: service.metadata
    }));
  }
}

module.exports = new HealthCheckService();
