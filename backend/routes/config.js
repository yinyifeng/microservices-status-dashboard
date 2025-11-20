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

module.exports = router;
