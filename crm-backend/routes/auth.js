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
    const userRole = role || 'manager';
    const roleCheck = await pool.query(
      'SELECT id FROM roles WHERE name = $1',
      [userRole]
    );

    if (roleCheck.rows.length === 0) {
      // Получаем список доступных ролей для сообщения об ошибке
      const availableRoles = await pool.query('SELECT name FROM roles ORDER BY name');
      const roleNames = availableRoles.rows.map(r => r.name);
      return res.status(400).json({ 
        error: `Invalid role. Must be one of: ${roleNames.join(', ')}` 
      });
    }

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создание пользователя
    const result = await pool.query(
      `INSERT INTO managers (email, password_hash, name, role, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, role, is_active, created_at`,
      [email, hashedPassword, name, userRole, is_active !== undefined ? is_active : true]
    );

    console.log('User created successfully:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint
    });
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;

