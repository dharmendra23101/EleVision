const express = require('express');
const { Pool } = require('pg');
const router = express.Router();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://username:password@localhost:5432/database_name',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// GET /api/alert-points - Get all active alert points
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        latitude,
        longitude,
        name,
        description,
        created_by,
        created_at,
        updated_at,
        is_active
      FROM alert_points 
      WHERE is_active = true 
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching alert points:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert points',
      message: error.message
    });
  }
});

// GET /api/alert-points/:id - Get specific alert point
router. get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      SELECT 
        id,
        latitude,
        longitude,
        name,
        description,
        created_by,
        created_at,
        updated_at,
        is_active
      FROM alert_points 
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res. status(404).json({
        success: false,
        error: 'Alert point not found'
      });
    }

    res.json({
      success: true,
      data: result. rows[0]
    });
  } catch (error) {
    console.error('Error fetching alert point:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch alert point',
      message: error.message
    });
  }
});

// POST /api/alert-points - Create new alert point
router.post('/', async (req, res) => {
  try {
    const { latitude, longitude, name, description, created_by } = req.body;

    // Validation
    if (!latitude || !longitude || !name) {
      return res.status(400).json({
        success: false,
        error: 'Latitude, longitude, and name are required'
      });
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90) {
      return res.status(400).json({
        success: false,
        error: 'Latitude must be between -90 and 90'
      });
    }

    if (longitude < -180 || longitude > 180) {
      return res.status(400).json({
        success: false,
        error: 'Longitude must be between -180 and 180'
      });
    }

    const result = await pool.query(`
      INSERT INTO alert_points (latitude, longitude, name, description, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING 
        id,
        latitude,
        longitude,
        name,
        description,
        created_by,
        created_at,
        updated_at,
        is_active
    `, [
      parseFloat(latitude),
      parseFloat(longitude),
      name. trim(),
      description ?  description.trim() : null,
      created_by || null
    ]);

    res. status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Alert point created successfully'
    });
  } catch (error) {
    console.error('Error creating alert point:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create alert point',
      message: error.message
    });
  }
});

// PUT /api/alert-points/:id - Update alert point
router. put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, name, description } = req.body;

    // Check if alert point exists
    const existingPoint = await pool.query('SELECT id FROM alert_points WHERE id = $1', [id]);
    
    if (existingPoint.rows.length === 0) {
      return res.status(404). json({
        success: false,
        error: 'Alert point not found'
      });
    }

    // Validation
    if (!latitude || !longitude || !name) {
      return res.status(400).json({
        success: false,
        error: 'Latitude, longitude, and name are required'
      });
    }

    const result = await pool.query(`
      UPDATE alert_points 
      SET 
        latitude = $1,
        longitude = $2,
        name = $3,
        description = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING 
        id,
        latitude,
        longitude,
        name,
        description,
        created_by,
        created_at,
        updated_at,
        is_active
    `, [
      parseFloat(latitude),
      parseFloat(longitude),
      name.trim(),
      description ? description.trim() : null,
      id
    ]);

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Alert point updated successfully'
    });
  } catch (error) {
    console.error('Error updating alert point:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update alert point',
      message: error. message
    });
  }
});

// DELETE /api/alert-points/:id - Soft delete alert point
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if alert point exists
    const existingPoint = await pool.query('SELECT id FROM alert_points WHERE id = $1', [id]);
    
    if (existingPoint. rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Alert point not found'
      });
    }

    // Soft delete by setting is_active to false
    await pool.query(`
      UPDATE alert_points 
      SET 
        is_active = false,
        updated_at = NOW()
      WHERE id = $1
    `, [id]);

    res.json({
      success: true,
      message: 'Alert point removed successfully'
    });
  } catch (error) {
    console.error('Error deleting alert point:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove alert point',
      message: error. message
    });
  }
});

// GET /api/alert-points/stats - Get statistics
router.get('/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_points,
        COUNT(*) FILTER (WHERE is_active = true) as active_points,
        COUNT(*) FILTER (WHERE is_active = false) as inactive_points,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as recent_points
      FROM alert_points
    `);

    res. json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

module. exports = router;