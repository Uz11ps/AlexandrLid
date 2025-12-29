import dotenv from 'dotenv';
dotenv.config(); // Загружаем переменные окружения в первую очередь

import express from 'express';
import cors from 'cors';

// Устанавливаем московский часовой пояс для всего приложения
process.env.TZ = 'Europe/Moscow';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
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
import botAdminRoutes from './routes/bot-admin.js';
import ticketsRoutes from './routes/tickets.js';
import permissionsRoutes from './routes/permissions.js';
import managersRoutes from './routes/managers.js';
import rolesRoutes from './routes/roles.js';
import { up as initFullCrm } from './migrations/000_init_full_crm.js';
import { createCourseTariffsTable } from './migrations/001_create_course_tariffs.js';
import { up as createRolesTable } from './migrations/002_create_roles.js';
import { up as removeRoleCheckConstraint } from './migrations/003_remove_role_check_constraint.js';
import { up as createChannelInvitesAndActivity } from './migrations/004_create_channel_invites_and_activity.js';
import { up as runContestSystemMigration } from './migrations/005_contest_system.js';
import { up as fixMissingColumns } from './migrations/006_fix_missing_columns.js';

// Обертка для миграции ролей с обработкой ошибок
async function runRolesMigration() {
  try {
    await createRolesTable();
    return true;
  } catch (error) {
    console.error('❌ Roles migration error:', error);
    return false;
  }
}

// Обертка для удаления CHECK constraint с обработкой ошибок
async function runRemoveRoleCheckConstraint() {
  try {
    await removeRoleCheckConstraint();
    return true;
  } catch (error) {
    console.error('❌ Remove role check constraint migration error:', error);
    return false;
  }
}

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CRM API Documentation',
      version: '1.0.0',
      description: 'API документация для CRM системы с Telegram ботом',
      contact: {
        name: 'API Support'
      }
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:3001',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Lead: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            fio: { type: 'string' },
            phone: { type: 'string' },
            email: { type: 'string' },
            telegram_username: { type: 'string' },
            source: { type: 'string' },
            status: { type: 'string' },
            funnel_stage: { type: 'string' },
            priority: { type: 'string' },
            manager_id: { type: 'integer' },
            notes: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./routes/*.js']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'CRM API Documentation'
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'crm-backend' });
});

// Routes
app.use('/auth', authRoutes);
app.use('/leads', leadsRoutes);
app.use('/tasks', tasksRoutes);
app.use('/products', productsRoutes);
app.use('/deals', dealsRoutes);
app.use('/students', studentsRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/funnel', funnelRoutes);
app.use('/templates', templatesRoutes);
app.use('/documents', documentsRoutes);
app.use('/webforms', webformsRoutes);
app.use('/bot-admin', botAdminRoutes);
app.use('/tickets', ticketsRoutes);
app.use('/permissions', permissionsRoutes);
app.use('/managers', managersRoutes);
app.use('/roles', rolesRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// Run migrations on startup
async function startServer() {
  try {
    console.log('🔄 Running database migrations...');
    
    // Инициализация базовых таблиц CRM
    await initFullCrm();
    console.log('✅ Migration 000 (init full CRM) completed');

    await createCourseTariffsTable();
    console.log('✅ Migration 001 (course_tariffs) completed');
    
    const rolesMigrationSuccess = await runRolesMigration();
    if (rolesMigrationSuccess) {
      console.log('✅ Migration 002 (roles) completed');
    }
    
    await runRemoveRoleCheckConstraint();
    
    try {
      await createChannelInvitesAndActivity();
      console.log('✅ Migration 004 (channel invites and activity) completed');
    } catch (error) {}
    
    try {
      await runContestSystemMigration();
      console.log('✅ Migration 005 (contest system) completed');
    } catch (error) {}
    
    // Применяем фикс недостающих колонок
    try {
      await fixMissingColumns();
    } catch (error) {
      console.error('❌ Error in migration 006:', error);
    }
    
    console.log('✅ All migrations completed');
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    console.warn('⚠️ Server will start anyway, but some features may not work');
    
    // Пытаемся выполнить миграцию 006 даже если другие миграции упали
    try {
      console.log('🔄 Attempting to run migration 006 after error...');
      await fixMissingColumns();
    } catch (err) {
      console.error('❌ Error in migration 006 (retry):', err);
    }
  }
  
  app.listen(PORT, () => {
    console.log(`🚀 CRM Backend server running on port ${PORT}`);
  });
}

startServer();
