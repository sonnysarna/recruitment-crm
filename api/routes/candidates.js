'use strict';

const router = require('express').Router();
const { body, query, param, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const crm = require('../utils/suitecrm');

// All candidate routes require auth
router.use(authenticate);

// ── List candidates ──────────────────────────────────────────
// GET /api/candidates?status=Active&specialisation=robotics&search=john&page=1
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('status').optional().isString(),
  query('specialisation').optional().isString(),
  query('search').optional().isString().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { status, specialisation, search, page = 1 } = req.query;
    const data = await crm.listCandidates({ status, specialisation, search }, parseInt(page));
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Get single candidate ─────────────────────────────────────
// GET /api/candidates/:id
router.get('/:id', [
  param('id').isUUID(),
], async (req, res) => {
  try {
    const data = await crm.get('Contacts', req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Create candidate ─────────────────────────────────────────
// POST /api/candidates
router.post('/', [
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('phone').optional().isMobilePhone(),
  body('currentTitle').optional().trim(),
  body('currentEmployer').optional().trim(),
  body('status').optional().isIn(['Active', 'Passive', 'Placed', 'Off-Limits', 'Do Not Contact']),
  body('noticePeriod').optional().trim(),
  body('salaryCurrent').optional().isNumeric(),
  body('salaryExpected').optional().isNumeric(),
  body('techStack').optional().trim(),
  body('githubUrl').optional().isURL(),
  body('linkedinUrl').optional().isURL(),
  body('arxivUrl').optional().isURL(),
  body('specialisation').optional().isIn([
    'Robotics Software', 'Controls Engineering', 'Mechatronics',
    'Perception & Computer Vision', 'Motion Planning', 'Edge AI',
    'Embedded Systems', 'Simulation', 'ROS/ROS2', 'Physical AI',
    'Automation Engineering', 'Hardware Engineering', 'Other',
  ]),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const data = await crm.createCandidate(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Update candidate ─────────────────────────────────────────
// PATCH /api/candidates/:id
router.patch('/:id', [
  param('id').isUUID(),
  body('status').optional().isIn(['Active', 'Passive', 'Placed', 'Off-Limits', 'Do Not Contact']),
  body('email').optional().isEmail(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const attrs = {};
    const fieldMap = {
      firstName: 'first_name', lastName: 'last_name', email: 'email1',
      phone: 'phone_mobile', currentTitle: 'title', currentEmployer: 'account_name',
      notes: 'description', status: 'candidate_status_c',
      noticePeriod: 'notice_period_c', salaryCurrent: 'salary_current_c',
      salaryExpected: 'salary_expected_c', techStack: 'tech_stack_c',
      githubUrl: 'github_url_c', linkedinUrl: 'linkedin_url_c',
      arxivUrl: 'arxiv_url_c', availability: 'availability_c',
      specialisation: 'specialisation_c',
    };

    Object.entries(req.body).forEach(([key, val]) => {
      if (fieldMap[key]) attrs[fieldMap[key]] = val;
    });

    const data = await crm.update('Contacts', req.params.id, attrs);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Delete candidate ─────────────────────────────────────────
// DELETE /api/candidates/:id
router.delete('/:id', [
  param('id').isUUID(),
], async (req, res) => {
  try {
    await crm.delete('Contacts', req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ── Link candidate to job ────────────────────────────────────
// POST /api/candidates/:id/link-job
router.post('/:id/link-job', [
  param('id').isUUID(),
  body('jobId').isUUID(),
  body('stage').optional().isIn(['Identified', 'Approached', 'Interested', 'Submitted', 'Interviewing', 'Offered', 'Placed', 'Rejected']),
], async (req, res) => {
  try {
    const rel = await crm.request('POST',
      `/modules/Contacts/${req.params.id}/relationships/opportunities`,
      {
        data: [{
          type: 'Opportunities',
          id: req.body.jobId,
          meta: { stage: req.body.stage || 'Identified' },
        }],
      }
    );
    res.json(rel);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
