import express from 'express';
import pool from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);

/**
 * @swagger
 * /students:
 *   get:
 *     summary: Получить список студентов
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: course_id
 *         schema:
 *           type: integer
 *       - in: query
 *         name: payment_status
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Список студентов
 */
router.get('/', async (req, res) => {
  try {
    const { course_id, group_id, payment_status } = req.query;
    let query = `
      SELECT s.*, 
             l.*,
             c.name as course_name,
             p.name as package_name,
             g.name as group_name,
             m.name as curator_name
      FROM students s
      LEFT JOIN leads l ON s.lead_id = l.id
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN packages p ON s.package_id = p.id
      LEFT JOIN study_groups g ON s.group_id = g.id
      LEFT JOIN managers m ON s.curator_id = m.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (course_id) {
      query += ` AND s.course_id = $${paramIndex++}`;
      params.push(parseInt(course_id));
    }

    if (group_id) {
      query += ` AND s.group_id = $${paramIndex++}`;
      params.push(parseInt(group_id));
    }

    if (payment_status) {
      query += ` AND s.payment_status = $${paramIndex++}`;
      params.push(payment_status);
    }

    query += ' ORDER BY s.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @swagger
 * /students/export/excel:
 *   get:
 *     summary: Экспортировать студентов в Excel
 *     tags: [Students]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Excel файл
 */
router.get('/export/excel', async (req, res) => {
  try {
    const { course_id, group_id, payment_status } = req.query;
    
    let query = `
      SELECT 
        s.id,
        s.contract_number,
        l.fio,
        l.phone,
        l.email,
        l.telegram_username,
        c.name as course_name,
        p.name as package_name,
        s.payment_amount,
        s.payment_currency,
        s.payment_status,
        s.progress_percent,
        s.start_date,
        s.graduation_date,
        g.name as group_name,
        m.name as curator_name,
        s.created_at
      FROM students s
      LEFT JOIN leads l ON s.lead_id = l.id
      LEFT JOIN courses c ON s.course_id = c.id
      LEFT JOIN packages p ON s.package_id = p.id
      LEFT JOIN study_groups g ON s.group_id = g.id
      LEFT JOIN managers m ON s.curator_id = m.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (course_id) {
      query += ` AND s.course_id = $${paramIndex++}`;
      params.push(parseInt(course_id));
    }
    if (group_id) {
      query += ` AND s.group_id = $${paramIndex++}`;
      params.push(parseInt(group_id));
    }
    if (payment_status) {
      query += ` AND s.payment_status = $${paramIndex++}`;
      params.push(payment_status);
    }

    query += ' ORDER BY s.created_at DESC';

    const result = await pool.query(query, params);
    const students = result.rows;

    // Используем динамический импорт для exceljs
    const exceljs = await import('exceljs');
    const ExcelJS = exceljs.default || exceljs;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Студенты');

    // Заголовки
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Номер договора', key: 'contract_number', width: 20 },
      { header: 'ФИО', key: 'fio', width: 25 },
      { header: 'Телефон', key: 'phone', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Telegram', key: 'telegram_username', width: 20 },
      { header: 'Курс', key: 'course_name', width: 25 },
      { header: 'Тариф', key: 'package_name', width: 20 },
      { header: 'Сумма оплаты', key: 'payment_amount', width: 15 },
      { header: 'Валюта', key: 'payment_currency', width: 10 },
      { header: 'Статус оплаты', key: 'payment_status', width: 15 },
      { header: 'Прогресс %', key: 'progress_percent', width: 12 },
      { header: 'Группа', key: 'group_name', width: 20 },
      { header: 'Куратор', key: 'curator_name', width: 20 },
      { header: 'Дата начала', key: 'start_date', width: 15 },
      { header: 'Дата окончания', key: 'graduation_date', width: 15 },
      { header: 'Дата создания', key: 'created_at', width: 20 }
    ];

    // Стиль заголовков
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Данные
    students.forEach(student => {
      worksheet.addRow({
        id: student.id,
        contract_number: student.contract_number || '',
        fio: student.fio || '',
        phone: student.phone || '',
        email: student.email || '',
        telegram_username: student.telegram_username || '',
        course_name: student.course_name || '',
        package_name: student.package_name || '',
        payment_amount: student.payment_amount || 0,
        payment_currency: student.payment_currency || 'RUB',
        payment_status: student.payment_status || '',
        progress_percent: student.progress_percent || 0,
        group_name: student.group_name || '',
        curator_name: student.curator_name || '',
        start_date: student.start_date ? new Date(student.start_date).toLocaleDateString('ru-RU') : '',
        graduation_date: student.graduation_date ? new Date(student.graduation_date).toLocaleDateString('ru-RU') : '',
        created_at: student.created_at ? new Date(student.created_at).toLocaleString('ru-RU') : ''
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=students_export_${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting students:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get single student
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Валидация и преобразование ID в число
    const studentId = parseInt(id, 10);
    if (isNaN(studentId) || studentId <= 0) {
      return res.status(400).json({ error: 'Invalid student ID' });
    }
    
    console.log(`[Students API] Fetching student with ID: ${studentId} (original: ${id})`);

    // Сначала проверяем существование студента без JOIN
    const checkResult = await pool.query('SELECT id, lead_id FROM students WHERE id = $1', [studentId]);
    if (checkResult.rows.length === 0) {
      console.log(`[Students API] Student ${studentId} not found in database`);
      return res.status(404).json({ error: 'Student not found' });
    }

    console.log(`[Students API] Student ${studentId} exists, lead_id: ${checkResult.rows[0].lead_id}`);

    // Get student with lead info
    // Явно перечисляем все колонки для избежания конфликтов имен
    const studentResult = await pool.query(
      `SELECT 
         s.id, s.lead_id, s.contract_number, s.start_date, s.course_id, s.package_id,
         s.payment_amount, s.payment_currency, s.payment_method, s.payment_status,
         s.installment_plan, s.installment_amount, s.installment_periods,
         s.materials_access, s.group_id, s.curator_id, s.progress_percent,
         s.graduation_date, s.created_at, s.updated_at,
         l.id as lead_table_id, l.user_id, l.fio, l.phone, l.email, l.telegram_username,
         l.country, l.city, l.age, l.source, l.utm_source, l.utm_medium, l.utm_campaign,
         l.referrer_id, l.trading_experience, l.interested_course,
         l.budget, l.ready_to_start, l.preferred_contact, l.timezone, l.notes,
         l.status, l.funnel_stage, l.manager_id, l.priority, l.tags,
         l.is_student, l.converted_to_student_at,
         c.name as course_name,
         p.name as package_name,
         g.name as group_name,
         m.name as curator_name,
         m.id as curator_id
       FROM students s
       LEFT JOIN leads l ON s.lead_id = l.id
       LEFT JOIN courses c ON s.course_id = c.id
       LEFT JOIN packages p ON s.package_id = p.id
       LEFT JOIN study_groups g ON s.group_id = g.id
       LEFT JOIN managers m ON s.curator_id = m.id
       WHERE s.id = $1`,
      [studentId]
    );

    console.log(`[Students API] Found ${studentResult.rows.length} student(s) with ID ${studentId} after JOIN`);

    if (studentResult.rows.length === 0) {
      console.log(`[Students API] Student ${studentId} exists but JOIN query returned no results`);
      return res.status(500).json({ error: 'Student exists but data loading failed', student_id: studentId });
    }

    const student = studentResult.rows[0];
    const leadId = student.lead_id;

    console.log(`[Students API] Loading additional data for student ${studentId}, lead_id: ${leadId}`);

    // Get payments
    const paymentsResult = await pool.query(
      `SELECT p.*, m.name as created_by_name
       FROM payments p
       LEFT JOIN managers m ON p.created_by = m.id
       WHERE p.student_id = $1 
       ORDER BY p.payment_date DESC, p.created_at DESC`,
      [studentId]
    );

    // Get debts
    const debtsResult = await pool.query(
      'SELECT * FROM debts WHERE student_id = $1 AND status = $2 ORDER BY due_date',
      [studentId, 'active']
    );

    // Get tasks related to lead
    const tasksResult = leadId ? await pool.query(
      `SELECT t.*, m.name as manager_name
       FROM tasks t
       LEFT JOIN managers m ON t.manager_id = m.id
       WHERE t.lead_id = $1
       ORDER BY t.due_date ASC, t.created_at DESC
       LIMIT 50`,
      [leadId]
    ) : { rows: [] };

    // Get interactions related to lead
    const interactionsResult = leadId ? await pool.query(
      `SELECT li.*, m.name as manager_name
       FROM lead_interactions li
       LEFT JOIN managers m ON li.manager_id = m.id
       WHERE li.lead_id = $1
       ORDER BY li.created_at DESC
       LIMIT 50`,
      [leadId]
    ) : { rows: [] };

    // Get comments related to lead
    const commentsResult = leadId ? await pool.query(
      `SELECT c.*, m.name as manager_name, m.email as manager_email
       FROM lead_comments c
       LEFT JOIN managers m ON c.manager_id = m.id
       WHERE c.lead_id = $1
       ORDER BY c.created_at DESC
       LIMIT 50`,
      [leadId]
    ) : { rows: [] };

    // Get documents related to student or lead
    const documentsResult = await pool.query(
      `SELECT d.*, m.name as created_by_name
       FROM documents d
       LEFT JOIN managers m ON d.created_by = m.id
       WHERE (d.student_id = $1 OR d.lead_id = $2)
       ORDER BY d.created_at DESC
       LIMIT 50`,
      [studentId, leadId || null]
    );

    console.log(`[Students API] Successfully loaded student ${studentId} with all related data`);

    res.json({
      ...student,
      payments: paymentsResult.rows,
      debts: debtsResult.rows,
      tasks: tasksResult.rows,
      interactions: interactionsResult.rows,
      comments: commentsResult.rows,
      documents: documentsResult.rows
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Convert lead to student
router.post('/convert', async (req, res) => {
  try {
    const {
      lead_id, course_id, package_id, payment_amount,
      payment_currency, payment_method, contract_number
    } = req.body;

    if (!lead_id) {
      return res.status(400).json({ error: 'lead_id is required' });
    }

    // Start transaction
    await pool.query('BEGIN');

    try {
      // Create student record
      const studentResult = await pool.query(
        `INSERT INTO students (
          lead_id, course_id, package_id, payment_amount,
          payment_currency, payment_method, contract_number,
          start_date, payment_status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, $8)
        RETURNING *`,
        [
          lead_id,
          course_id || null,
          package_id || null,
          payment_amount || null,
          payment_currency || 'RUB',
          payment_method || null,
          contract_number || null,
          'pending'
        ]
      );

      // Update lead
      await pool.query(
        `UPDATE leads 
         SET is_student = TRUE, 
             converted_to_student_at = CURRENT_TIMESTAMP,
             funnel_stage = 'Конвертирован в студента',
             status = 'Студент'
         WHERE id = $1`,
        [lead_id]
      );

      await pool.query('COMMIT');

      const createdStudent = studentResult.rows[0];
      console.log(`[Students API] Student created successfully with ID: ${createdStudent.id}`);
      
      res.status(201).json(createdStudent);
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error converting lead to student:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Update student
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateFields = req.body;

    const allowedFields = [
      'progress_percent', 'materials_access', 'group_id',
      'curator_id', 'payment_status', 'installment_plan'
    ];

    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updateFields.hasOwnProperty(field)) {
        updates.push(`${field} = $${paramIndex++}`);
        values.push(updateFields[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(parseInt(id));

    const result = await pool.query(
      `UPDATE students SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add payment
router.post('/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amount, currency, payment_method, payment_date,
      payment_type, installment_number, transaction_id, notes
    } = req.body;

    const result = await pool.query(
      `INSERT INTO payments (
        student_id, amount, currency, payment_method, payment_date,
        payment_type, installment_number, transaction_id, notes, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        parseInt(id), amount, currency || 'RUB', payment_method, payment_date,
        payment_type || 'full', installment_number || null, transaction_id || null,
        notes || null, req.user.id
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

