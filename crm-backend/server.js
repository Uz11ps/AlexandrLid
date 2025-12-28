import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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
import { createCourseTariffsTable } from './migrations/001_create_course_tariffs.js';
import { up as createRolesTable } from './migrations/002_create_roles.js';
import { up as removeRoleCheckConstraint } from './migrations/003_remove_role_check_constraint.js';
import { up as createChannelInvitesAndActivity } from './migrations/004_create_channel_invites_and_activity.js';
import { up as runContestSystemMigration } from './migrations/005_contest_system.js';

// Обертка для миграции ролей с обработкой ошибок
async function runRolesMigration() {
  try {
    await createRolesTable();
    return true;
  } catch (error) {
    console.error('❌ Roles migration error:', error);
    console.error('Error details:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
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
    console.error('Error details:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    return false;
  }
}

dotenv.config();

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
        },
        Task: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            lead_id: { type: 'integer' },
            manager_id: { type: 'integer' },
            title: { type: 'string' },
            description: { type: 'string' },
            task_type: { type: 'string' },
            due_date: { type: 'string', format: 'date' },
            due_time: { type: 'string' },
            priority: { type: 'string' },
            status: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Ticket: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            user_id: { type: 'integer' },
            manager_id: { type: 'integer' },
            subject: { type: 'string' },
            status: { type: 'string' },
            priority: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Student: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            lead_id: { type: 'integer' },
            course_id: { type: 'integer' },
            payment_amount: { type: 'number' },
            payment_status: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'string' }
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
  apis: ['./routes/*.js'] // Путь к файлам с роутами
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

// Routes (без /api префикса, так как Nginx уже обрабатывает /api)
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
    await createCourseTariffsTable();
    console.log('✅ Migration 001 (course_tariffs) completed');
    
    const rolesMigrationSuccess = await runRolesMigration();
    if (rolesMigrationSuccess) {
      console.log('✅ Migration 002 (roles) completed');
    } else {
      console.warn('⚠️ Roles migration failed, but server will continue');
      console.warn('⚠️ Some features related to roles may not work correctly');
      console.warn('⚠️ Please check the logs above for details');
    }
    
    // Удаление CHECK constraint на role
    const removeCheckConstraintSuccess = await runRemoveRoleCheckConstraint();
    if (removeCheckConstraintSuccess) {
      console.log('✅ Migration 003 (remove role check constraint) completed');
    } else {
      console.warn('⚠️ Remove role check constraint migration failed, but server will continue');
      console.warn('⚠️ Creating users with custom roles may not work');
      console.warn('⚠️ Please check the logs above for details');
    }
    
    // Создание таблиц для пригласительных ссылок и активности
    try {
      await createChannelInvitesAndActivity();
      console.log('✅ Migration 004 (channel invites and activity) completed');
    } catch (error) {
      console.error('❌ Migration 004 failed:', error);
      console.warn('⚠️ Channel invites and activity features may not work');
    }
    
    // Система конкурса
    try {
      await runContestSystemMigration();
      console.log('✅ Migration 005 (contest system) completed');
    } catch (error) {
      console.error('❌ Migration 005 failed:', error);
      console.warn('⚠️ Contest system features may not work');
    }
    
    console.log('✅ All migrations completed');
  } catch (error) {
    console.error('❌ Error running migrations:', error);
    // Не останавливаем сервер, но логируем ошибку
    console.warn('⚠️ Server will start anyway, but some features may not work');
  }
  
  // Start server
  app.listen(PORT, () => {
    console.log(`🚀 CRM Backend server running on port ${PORT}`);
  });
}

startServer();

