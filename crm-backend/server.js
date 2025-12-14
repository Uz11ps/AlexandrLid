import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import leadsRoutes from './routes/leads.js';
import tasksRoutes from './routes/tasks.js';
import authRoutes from './routes/auth.js';
import productsRoutes from './routes/products.js';
import dealsRoutes from './routes/deals.js';
import studentsRoutes from './routes/students.js';
import analyticsRoutes from './routes/analytics.js';
import funnelRoutes from './routes/funnel.js';
import templatesRoutes from './routes/templates.js';
import documentsRoutes from './routes/documents.js';
import webformsRoutes from './routes/webforms.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'crm-backend' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/funnel', funnelRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/webforms', webformsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 CRM Backend server running on port ${PORT}`);
});

