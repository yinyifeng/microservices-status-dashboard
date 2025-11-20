const express = require('express');
const router = express.Router();
const healthCheckService = require('../services/healthCheck');

// GET /api/status - Get all service statuses
router.get('/', (req, res) => {
  try {
    const statuses = healthCheckService.getAllStatuses();
    
    res.json({
      timestamp: new Date().toISOString(),
      services: statuses,
      summary: {
        total: statuses.length,
        healthy: statuses.filter(s => s.status === 'healthy').length,
        warning: statuses.filter(s => s.status === 'warning').length,
        down: statuses.filter(s => s.status === 'down').length
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve service statuses',
      message: error.message
    });
  }
});

// GET /api/status/:serviceId - Get specific service status
router.get('/:serviceId', (req, res) => {
  try {
    const status = healthCheckService.getServiceStatus(req.params.serviceId);
    
    if (!status) {
      return res.status(404).json({
        error: 'Service not found',
        serviceId: req.params.serviceId
      });
    }
    
    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve service status',
      message: error.message
    });
  }
});

module.exports = router;
