import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db.js';

const router = express.Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Авторизация менеджера
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: manager@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Успешная авторизация
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *                     role:
 *                       type: string
 *       400:
 *         description: Неверный запрос
 *       401:
 *         description: Неверные учетные данные
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await pool.query(
      'SELECT * FROM managers WHERE email = $1 AND is_active = TRUE',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const manager = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, manager.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await pool.query(
      'UPDATE managers SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [manager.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { id: manager.id, email: manager.email, role: manager.role },
      process.env.JWT_SECRET || 'default_secret_change_in_production',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: manager.id,
        email: manager.email,
        name: manager.name,
        role: manager.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware to verify JWT token (defined before use)
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET || 'default_secret_change_in_production',
    (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Invalid or expired token' });
      }
      req.user = user;
      next();
    }
  );
};

// Register new manager (admin only)
router.post('/register', authenticateToken, async (req, res) => {
  try {
    // Проверка прав доступа (только админ может создавать пользователей)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { email, password, name, role, is_active } = req.body;

    console.log('Registration request:', { email, name, role, is_active: is_active !== undefined ? is_active : 'not provided' });

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    // Проверка существования пользователя
    const existingUser = await pool.query(
      'SELECT id FROM managers WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Валидация роли - проверяем существование роли в базе данных
    let userRole = role;
    
    // Если роль не указана, используем 'manager' по умолчанию
    if (!userRole || userRole.trim() === '') {
      userRole = 'manager';
    }
    
    // Проверяем существование роли в базе данных
    const roleCheck = await pool.query(
      'SELECT id, name FROM roles WHERE name = $1',
      [userRole]
    );

    if (roleCheck.rows.length === 0) {
      // Получаем список доступных ролей для сообщения об ошибке
      const availableRoles = await pool.query('SELECT name FROM roles ORDER BY name');
      const roleNames = availableRoles.rows.map(r => r.name);
      
      // Если таблица roles пуста или не существует, возвращаем стандартные роли
      if (roleNames.length === 0) {
        roleNames.push('admin', 'manager', 'marketer', 'accountant');
      }
      
      return res.status(400).json({ 
        error: `Invalid role "${userRole}". Must be one of: ${roleNames.join(', ')}`,
        providedRole: userRole,
        availableRoles: roleNames
      });
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создание пользователя
    // Проверяем, есть ли внешний ключ на roles
    const hasForeignKey = await pool.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'managers' 
      AND constraint_type = 'FOREIGN KEY' 
      AND constraint_name LIKE '%role%'
    `);

    let result;
    if (hasForeignKey.rows.length > 0) {
      // Если есть внешний ключ, используем обычный INSERT
      result = await pool.query(
        `INSERT INTO managers (email, password_hash, name, role, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, name, role, is_active, created_at`,
        [email, hashedPassword, name, userRole, is_active !== undefined ? is_active : true]
      );
    } else {
      // Если внешнего ключа нет, все равно пытаемся вставить
      // (на случай, если миграция еще не выполнилась)
      try {
        result = await pool.query(
          `INSERT INTO managers (email, password_hash, name, role, is_active)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, email, name, role, is_active, created_at`,
          [email, hashedPassword, name, userRole, is_active !== undefined ? is_active : true]
        );
      } catch (insertError) {
        // Если ошибка связана с внешним ключом, но его нет, значит проблема в другом
        throw insertError;
      }
    }

    console.log('User created successfully:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      stack: error.stack
    });
    
    // Более детальные сообщения об ошибках
    let errorMessage = 'Internal server error';
    let statusCode = 500;
    
    if (error.code === '23503') { // Foreign key violation
      errorMessage = `Role "${role || 'manager'}" does not exist in the database`;
      statusCode = 400;
    } else if (error.code === '23505') { // Unique violation
      errorMessage = 'User with this email already exists';
      statusCode = 400;
    } else if (error.constraint) {
      errorMessage = `Database constraint violation: ${error.constraint}`;
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      code: error.code,
      constraint: error.constraint
    });
  }
});

export default router;

