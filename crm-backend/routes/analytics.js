import express from 'express';
import pool from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);

// Get sales funnel analytics
router.get('/funnel', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    let dateFilter = '';
    const params = [];
    if (start_date && end_date) {
      dateFilter = 'WHERE l.created_at BETWEEN $1 AND $2';
      params.push(start_date, end_date);
    }

    const result = await pool.query(
      `SELECT 
        l.funnel_stage,
        COUNT(*) as count,
        COUNT(CASE WHEN l.is_student = TRUE THEN 1 END) as converted
      FROM leads l
      ${dateFilter}
      GROUP BY l.funnel_stage
      ORDER BY 
        CASE l.funnel_stage
          WHEN 'Новый лид' THEN 1
          WHEN 'Первичный контакт' THEN 2
          WHEN 'Квалификация' THEN 3
          WHEN 'Презентация курса' THEN 4
          WHEN 'Работа с возражениями' THEN 5
          WHEN 'Отправка оффера' THEN 6
          WHEN 'Ожидание оплаты' THEN 7
          WHEN 'Конвертирован в студента' THEN 8
          WHEN 'Отказ' THEN 9
          ELSE 10
        END`,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching funnel analytics:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get financial analytics
router.get('/financial', async (req, res) => {
  try {
    const { period = 'month' } = req.query; // day, week, month, year

    let dateFilter = '';
    let dateGroupBy = '';
    switch (period) {
      case 'day':
        dateFilter = "WHERE payment_date = CURRENT_DATE";
        break;
      case 'week':
        dateFilter = "WHERE payment_date >= CURRENT_DATE - INTERVAL '7 days'";
        dateGroupBy = "GROUP BY DATE(payment_date)";
        break;
      case 'month':
        dateFilter = "WHERE payment_date >= DATE_TRUNC('month', CURRENT_DATE)";
        dateGroupBy = "GROUP BY DATE(payment_date)";
        break;
      case 'year':
        dateFilter = "WHERE payment_date >= DATE_TRUNC('year', CURRENT_DATE)";
        dateGroupBy = "GROUP BY DATE_TRUNC('month', payment_date)";
        break;
    }

    // Total revenue
    const revenueResult = await pool.query(
      `SELECT 
        COALESCE(SUM(amount), 0) as total_revenue,
        COUNT(*) as transaction_count,
        COALESCE(AVG(amount), 0) as average_check
      FROM payments
      ${dateFilter}
      WHERE status = 'completed'`
    );

    // Revenue by source
    const sourceResult = await pool.query(
      `SELECT 
        COALESCE(l.source, 'Не указан') as source,
        COALESCE(SUM(p.amount), 0) as revenue,
        COUNT(DISTINCT p.student_id) as students_count
      FROM payments p
      JOIN students s ON p.student_id = s.id
      JOIN leads l ON s.lead_id = l.id
      ${dateFilter.replace('payment_date', 'p.payment_date')}
      WHERE p.status = 'completed'
      GROUP BY l.source
      ORDER BY revenue DESC`
    );

    // Active students count
    const studentsResult = await pool.query(
      `SELECT COUNT(*) as active_students
       FROM students s
       JOIN leads l ON s.lead_id = l.id
       WHERE s.payment_status IN ('paid', 'partial')`
    );

    // Revenue trend (daily/monthly)
    let trendResult = { rows: [] };
    if (dateGroupBy) {
      trendResult = await pool.query(
        `SELECT 
          DATE(payment_date) as date,
          COALESCE(SUM(amount), 0) as revenue,
          COUNT(*) as transactions
        FROM payments
        ${dateFilter}
        WHERE status = 'completed'
        ${dateGroupBy}
        ORDER BY date ASC`
      );
    }

    res.json({
      revenue: revenueResult.rows[0],
      by_source: sourceResult.rows,
      active_students: parseInt(studentsResult.rows[0]?.active_students || 0),
      trend: trendResult.rows || []
    });
  } catch (error) {
    console.error('Error fetching financial analytics:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get manager performance
router.get('/managers', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        m.id,
        m.name,
        m.email,
        COUNT(DISTINCT l.id) as leads_count,
        COUNT(DISTINCT CASE WHEN l.is_student = TRUE THEN l.id END) as converted_count,
        COUNT(DISTINCT d.id) as deals_count,
        COALESCE(SUM(d.amount), 0) as total_revenue,
        COUNT(DISTINCT t.id) as tasks_completed
      FROM managers m
      LEFT JOIN leads l ON m.id = l.manager_id
      LEFT JOIN deals d ON m.id = d.manager_id AND d.stage = 'closed'
      LEFT JOIN tasks t ON m.id = t.manager_id AND t.status = 'completed'
      GROUP BY m.id, m.name, m.email
      ORDER BY total_revenue DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching manager performance:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Get source analytics
router.get('/sources', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        COALESCE(l.source, 'Не указан') as source,
        COUNT(*) as leads_count,
        COUNT(CASE WHEN l.is_student = TRUE THEN 1 END) as converted_count,
        ROUND(COUNT(CASE WHEN l.is_student = TRUE THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as conversion_rate,
        COALESCE(SUM(p.amount), 0) as total_revenue
      FROM leads l
      LEFT JOIN students s ON l.id = s.lead_id
      LEFT JOIN payments p ON s.id = p.student_id AND p.status = 'completed'
      GROUP BY l.source
      ORDER BY leads_count DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching source analytics:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Dashboard summary
router.get('/dashboard', async (req, res) => {
  try {
    // Total leads
    const leadsResult = await pool.query('SELECT COUNT(*) as total FROM leads');
    
    // Active students
    const studentsResult = await pool.query(
      "SELECT COUNT(*) as total FROM students WHERE payment_status IN ('paid', 'partial')"
    );

    // Total revenue (this month)
    const revenueResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM payments
       WHERE payment_date >= DATE_TRUNC('month', CURRENT_DATE)
       AND status = 'completed'`
    );

    // Pending tasks
    const tasksResult = await pool.query(
      "SELECT COUNT(*) as total FROM tasks WHERE status IN ('new', 'in_progress')"
    );

    // Recent conversions
    const conversionsResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM leads
       WHERE converted_to_student_at >= CURRENT_DATE - INTERVAL '7 days'`
    );

    res.json({
      leads: parseInt(leadsResult.rows[0].total),
      students: parseInt(studentsResult.rows[0].total),
      revenue: parseFloat(revenueResult.rows[0].total),
      pending_tasks: parseInt(tasksResult.rows[0].total),
      recent_conversions: parseInt(conversionsResult.rows[0].total)
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

export default router;

