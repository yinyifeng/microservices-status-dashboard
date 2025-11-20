const express = require('express');
const router = express.Router();
const healthCheckService = require('../services/healthCheck');

// POST /api/config/reload - Reload configuration
router.post('/reload', (req, res) => {
  try {
    healthCheckService.reloadConfiguration();
    
    res.json({
      success: true,
      message: 'Configuration reloaded successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to reload configuration',
      message: error.message
    });
  }
});

// POST /api/config/service - Add a new service
router.post('/service', (req, res) => {
  try {
    const { name, endpoint, type, category, pollInterval, criticalService, metadata } = req.body;
    
    // Validate required fields
    if (!name || !endpoint) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        message: 'Name and endpoint are required'
      });
    }
    
    // Validate endpoint URL
    try {
      new URL(endpoint);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid endpoint URL',
        message: 'Endpoint must be a valid URL'
      });
    }
    
    const serviceData = {
      name,
      endpoint,
      type,
      category,
      pollInterval: pollInterval ? parseInt(pollInterval) : undefined,
      criticalService,
      metadata
    };
    
    const newService = healthCheckService.addService(serviceData);
    
    res.json({
      success: true,
      message: 'Service added successfully',
      service: newService,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to add service',
      message: error.message
    });
  }
});

// GET /api/config/services - Get all configured services
router.get('/services', (req, res) => {
  try {
    const services = healthCheckService.getAllServices();
    
    res.json({
      success: true,
      services: services,
      count: services.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get services',
      message: error.message
    });
  }
});

// DELETE /api/config/service/:serviceId - Delete a service
router.delete('/service/:serviceId', (req, res) => {
  try {
    const { serviceId } = req.params;
    
    if (!serviceId) {
      return res.status(400).json({
        success: false,
        error: 'Missing service ID',
        message: 'Service ID is required'
      });
    }
    
    const deletedService = healthCheckService.deleteService(serviceId);
    
    res.json({
      success: true,
      message: 'Service deleted successfully',
      service: deletedService,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete service',
      message: error.message
    });
  }
});

module.exports = router;
