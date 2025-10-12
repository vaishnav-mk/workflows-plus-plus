const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Workflows Dashboard API is running',
    timestamp: new Date().toISOString()
  });
});

// Workflow routes
app.get('/api/workflows', (req, res) => {
  res.json({
    workflows: [
      {
        id: '1',
        name: 'Sample Workflow',
        description: 'A sample Cloudflare workflow',
        nodes: [],
        edges: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ]
  });
});

app.post('/api/workflows', (req, res) => {
  const { name, description, nodes, edges } = req.body;
  
  const newWorkflow = {
    id: Date.now().toString(),
    name,
    description,
    nodes: nodes || [],
    edges: edges || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  res.status(201).json(newWorkflow);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: err.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
