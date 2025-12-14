import express from 'express';
import pool from '../db.js';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);

// Get document templates
router.get('/templates', async (req, res) => {
  try {
    const { document_type } = req.query;
    let query = 'SELECT * FROM document_templates WHERE is_active = TRUE';
    const params = [];

    if (document_type) {
      query += ' AND document_type = $1';
      params.push(document_type);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching document templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create document template
router.post('/templates', async (req, res) => {
  try {
    const { name, document_type, template_content, variables, format } = req.body;

    const result = await pool.query(
      `INSERT INTO document_templates (name, document_type, template_content, variables, format)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        name,
        document_type,
        template_content,
        JSON.stringify(variables || {}),
        format || 'pdf'
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating document template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get documents
router.get('/', async (req, res) => {
  try {
    const { lead_id, student_id, deal_id, document_type } = req.query;
    let query = `
      SELECT d.*, 
             m.name as created_by_name,
             l.fio as lead_name
      FROM documents d
      LEFT JOIN managers m ON d.created_by = m.id
      LEFT JOIN leads l ON d.lead_id = l.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (lead_id) {
      query += ` AND d.lead_id = $${paramIndex++}`;
      params.push(parseInt(lead_id));
    }

    if (student_id) {
      query += ` AND d.student_id = $${paramIndex++}`;
      params.push(parseInt(student_id));
    }

    if (deal_id) {
      query += ` AND d.deal_id = $${paramIndex++}`;
      params.push(parseInt(deal_id));
    }

    if (document_type) {
      query += ` AND d.document_type = $${paramIndex++}`;
      params.push(document_type);
    }

    query += ' ORDER BY d.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create document (placeholder - actual generation would require PDF/DOCX library)
router.post('/', async (req, res) => {
  try {
    const {
      document_type, lead_id, student_id, deal_id,
      template_id, file_name, file_path, file_size, mime_type
    } = req.body;

    if (!document_type) {
      return res.status(400).json({ error: 'document_type is required' });
    }

    // At least one of lead_id, student_id, or deal_id must be provided
    if (!lead_id && !student_id && !deal_id) {
      return res.status(400).json({ error: 'At least one of lead_id, student_id, or deal_id must be provided' });
    }

    // Validate that referenced entities exist
    if (lead_id) {
      const leadCheck = await pool.query('SELECT id FROM leads WHERE id = $1', [lead_id]);
      if (leadCheck.rows.length === 0) {
        return res.status(400).json({ error: `Lead with id ${lead_id} not found` });
      }
    }

    if (student_id) {
      const studentCheck = await pool.query('SELECT id FROM students WHERE id = $1', [student_id]);
      if (studentCheck.rows.length === 0) {
        return res.status(400).json({ error: `Student with id ${student_id} not found` });
      }
    }

    if (deal_id) {
      const dealCheck = await pool.query('SELECT id FROM deals WHERE id = $1', [deal_id]);
      if (dealCheck.rows.length === 0) {
        return res.status(400).json({ error: `Deal with id ${deal_id} not found` });
      }
    }

    // Generate file_name if not provided
    let generatedFileName = file_name;
    if (!generatedFileName) {
      const documentTypeLabels = {
        contract: 'Договор',
        invoice: 'Счет',
        act: 'Акт',
        certificate: 'Сертификат',
        reference: 'Справка',
        other: 'Документ'
      };
      const typeLabel = documentTypeLabels[document_type] || 'Документ';
      const date = new Date().toISOString().split('T')[0];
      const entityId = lead_id || student_id || deal_id;
      generatedFileName = `${typeLabel}_${entityId}_${date}.pdf`;
    }

    const result = await pool.query(
      `INSERT INTO documents (
        document_type, lead_id, student_id, deal_id,
        template_id, file_name, file_path, file_size, mime_type, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        document_type,
        lead_id ? parseInt(lead_id) : null,
        student_id ? parseInt(student_id) : null,
        deal_id ? parseInt(deal_id) : null,
        template_id || null,
        generatedFileName,
        file_path || null,
        file_size || null,
        mime_type || 'application/pdf',
        req.user.id
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Update document status
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, signed_at } = req.body;

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(status);
    }

    if (signed_at !== undefined) {
      updates.push(`signed_at = $${paramIndex++}`);
      values.push(signed_at);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(parseInt(id));

    const result = await pool.query(
      `UPDATE documents SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

