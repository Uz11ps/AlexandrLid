import express from 'express';
import pool from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);

// Middleware для проверки прав админа
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Получить все права
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM permissions ORDER BY resource, action');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получить права роли
router.get('/roles/:role', async (req, res) => {
  try {
    const { role } = req.params;

    const result = await pool.query(
      `SELECT p.*, rp.role
       FROM permissions p
       LEFT JOIN role_permissions rp ON p.id = rp.permission_id AND rp.role = $1
       ORDER BY p.resource, p.action`,
      [role]
    );

    const permissions = result.rows.map(p => ({
      ...p,
      granted: p.role !== null
    }));

    res.json(permissions);
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Обновить права роли
router.put('/roles/:role', requireAdmin, async (req, res) => {
  try {
    const { role } = req.params;
    const { permission_ids } = req.body; // массив ID разрешенных прав

    // Удалить все существующие права роли
    await pool.query('DELETE FROM role_permissions WHERE role = $1', [role]);

    // Добавить новые права
    if (permission_ids && permission_ids.length > 0) {
      const values = permission_ids.map((pid, index) => `($${index * 2 + 1}, $${index * 2 + 2})`).join(', ');
      const params = permission_ids.flatMap(pid => [role, pid]);
      await pool.query(
        `INSERT INTO role_permissions (role, permission_id) VALUES ${values}`,
        params
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating role permissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получить права пользователя
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Проверка прав доступа
    if (req.user.role !== 'admin' && parseInt(userId) !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Получить роль пользователя
    const userResult = await pool.query('SELECT role FROM managers WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userRole = userResult.rows[0].role;

    // Получить права роли
    const rolePermissionsResult = await pool.query(
      `SELECT p.* FROM permissions p
       INNER JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role = $1`,
      [userRole]
    );

    // Получить переопределения прав пользователя
    const userPermissionsResult = await pool.query(
      `SELECT p.*, up.granted
       FROM permissions p
       INNER JOIN user_permissions up ON p.id = up.permission_id
       WHERE up.manager_id = $1`,
      [userId]
    );

    // Объединить права роли и переопределения
    const permissionsMap = new Map();
    
    // Сначала добавляем права роли
    rolePermissionsResult.rows.forEach(p => {
      permissionsMap.set(p.id, { ...p, granted: true, source: 'role' });
    });

    // Затем применяем переопределения пользователя
    userPermissionsResult.rows.forEach(p => {
      permissionsMap.set(p.id, { ...p, granted: p.granted, source: 'user' });
    });

    res.json(Array.from(permissionsMap.values()));
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Обновить права пользователя
router.put('/users/:userId', requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { permissions } = req.body; // массив объектов {permission_id, granted}

    // Удалить все существующие переопределения прав пользователя
    await pool.query('DELETE FROM user_permissions WHERE manager_id = $1', [userId]);

    // Добавить новые переопределения
    if (permissions && permissions.length > 0) {
      const values = permissions.map((p, index) => 
        `($${index * 3 + 1}, $${index * 3 + 2}, $${index * 3 + 3})`
      ).join(', ');
      const params = permissions.flatMap(p => [userId, p.permission_id, p.granted]);
      await pool.query(
        `INSERT INTO user_permissions (manager_id, permission_id, granted) VALUES ${values}`,
        params
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user permissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Проверка прав доступа (для использования в других роутах)
export async function checkPermission(req, resource, action) {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // Админы имеют все права
    if (userRole === 'admin') {
      return true;
    }

    // Получить ID права
    const permissionResult = await pool.query(
      'SELECT id FROM permissions WHERE resource = $1 AND action = $2',
      [resource, action]
    );

    if (permissionResult.rows.length === 0) {
      return false;
    }

    const permissionId = permissionResult.rows[0].id;

    // Проверить переопределение прав пользователя
    const userPermissionResult = await pool.query(
      'SELECT granted FROM user_permissions WHERE manager_id = $1 AND permission_id = $2',
      [userId, permissionId]
    );

    if (userPermissionResult.rows.length > 0) {
      return userPermissionResult.rows[0].granted;
    }

    // Проверить права роли
    const rolePermissionResult = await pool.query(
      'SELECT 1 FROM role_permissions WHERE role = $1 AND permission_id = $2',
      [userRole, permissionId]
    );

    return rolePermissionResult.rows.length > 0;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}

// Middleware для проверки прав
export function requirePermission(resource, action) {
  return async (req, res, next) => {
    const hasPermission = await checkPermission(req, resource, action);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    next();
  };
}

export default router;

