const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env. PORT || 4000;

// Initialize Supabase client
const supabase = createClient(
  'https://jxxqccijzqkdfgpxrxny.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4eHFjY2lqenFrZGZncHhyeG55Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ3NjU0MywiZXhwIjoyMDc5MDUyNTQzfQ.BDvhksVgM66KEexV52IUOFZxZAy5jT2tOD3EH5R7DVg'
);

// Test Supabase connection
const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('alert_points')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log('⚠️ Table might not exist, that\'s okay');
    }
    
    console.log('✅ Connected to Supabase successfully');
    console. log(`📊 Database ready`);
  } catch (err) {
    console.error('❌ Supabase connection error:', err. message);
  }
};

// Test connection on startup
testConnection();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0. 1:5173'],
  credentials: true
}));
app.use(express.json());

// Routes
// GET /api/alert-points - Get all active alert points
app. get('/api/alert-points', async (req, res) => {
  try {
    console.log('GET /api/alert-points - Fetching alert points from Supabase');
    
    const { data, error } = await supabase
      . from('alert_points')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    console.log(`✅ Found ${data.length} active alert points`);

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('❌ Error fetching alert points:', error.message);
    res. status(500).json({
      success: false,
      error: 'Failed to fetch alert points',
      message: error.message
    });
  }
});

// POST /api/alert-points - Create new alert point
app. post('/api/alert-points', async (req, res) => {
  try {
    console.log('POST /api/alert-points - Creating new alert point in Supabase:', req.body);
    
    const { latitude, longitude, name, description, created_by } = req.body;

    // Validation
    if (!latitude || !longitude || ! name) {
      return res.status(400). json({
        success: false,
        error: 'Latitude, longitude, and name are required'
      });
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90) {
      return res.status(400). json({
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

    // Insert into Supabase
    const { data, error } = await supabase
      . from('alert_points')
      .insert({
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        name: name. trim(),
        description: description ?  description.trim() : null,
        created_by: created_by || null
      })
      . select()
      .single();

    if (error) {
      throw error;
    }

    console. log('✅ Alert point created successfully in Supabase:', data);

    res.status(201). json({
      success: true,
      data: data,
      message: 'Alert point created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating alert point:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create alert point',
      message: error.message
    });
  }
});

// DELETE /api/alert-points/:id - Soft delete alert point
app.delete('/api/alert-points/:id', async (req, res) => {
  try {
    console.log('DELETE /api/alert-points/:id - Soft deleting alert point:', req.params.id);
    
    const { id } = req.params;

    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('alert_points')
      .update({ 
        is_active: false,
        updated_at: new Date(). toISOString()
      })
      .eq('id', id);

    if (error) {
      throw error;
    }

    console.log('✅ Alert point soft deleted successfully:', id);

    res.json({
      success: true,
      message: 'Alert point removed successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting alert point:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to remove alert point',
      message: error.message
    });
  }
});

// GET /api/alert-points/stats - Get statistics
app.get('/api/alert-points/stats', async (req, res) => {
  try {
    console.log('GET /api/alert-points/stats - Fetching statistics from Supabase');
    
    const { count: totalCount, error: totalError } = await supabase
      .from('alert_points')
      . select('*', { count: 'exact', head: true });

    const { count: activeCount, error: activeError } = await supabase
      .from('alert_points')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (totalError || activeError) {
      throw totalError || activeError;
    }

    console. log('✅ Statistics fetched successfully');

    res.json({
      success: true,
      data: {
        total_points: totalCount,
        active_points: activeCount,
        inactive_points: totalCount - activeCount
      }
    });
  } catch (error) {
    console.error('❌ Error fetching stats:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics',
      message: error.message
    });
  }
});

// Health check
app.get('/', (req, res) => {
  res.json({ 
    message: 'EleVision API Server',
    status: 'running',
    port: PORT,
    timestamp: new Date().toISOString(),
    database: 'Supabase'
  });
});

// GET /api/health - Health check with database status
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let alertPointsCount = 0;

  try {
    const { count, error } = await supabase
      . from('alert_points')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    if (! error) {
      dbStatus = 'connected';
      alertPointsCount = count || 0;
    }
  } catch (err) {
    console.error('❌ Database health check failed:', err.message);
  }

  res. json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    server: {
      port: PORT,
      environment: process.env. NODE_ENV || 'development'
    },
    database: {
      status: dbStatus,
      type: 'Supabase'
    },
    data: {
      activeAlertPoints: alertPointsCount
    }
  });
});

// Error handling middleware
app. use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.stack);
  res. status(500).json({
    success: false,
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  console.log('❌ 404 - Route not found:', req.originalUrl);
  res.status(404). json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console. log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console. log(`🗄️ Database: Supabase`);
  console. log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📍 Alert points: http://localhost:${PORT}/api/alert-points`);
});

module.exports = app;