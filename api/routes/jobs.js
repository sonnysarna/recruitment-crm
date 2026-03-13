'use strict';

const router = require('express').Router();
const { body, query, param, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const crm = require('../utils/suitecrm');

router.use(authenticate);

const JOB_STAGES = [
  'Briefed', 'Sourcing', 'Longlisting', 'Shortlisting',
  'Interviewing', 'Offer Stage', 'Placed', 'On Hold', 'Cancelled',
];

// GET /api/jobs
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('stage').optional().isString(),
  query('search').optional().isString().trim(),
  query('clientId').optional().isUUID(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const { stage, search, page = 1 } = req.query;
    const data = await crm.listJobs({ stage, search }, parseInt(page));
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/jobs/:id
router.get('/:id', [param('id').isUUID()], async (req, res) => {
  try {
    const data = await crm.get('Opportunities', req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/jobs/:id/candidates — all candidates linked to this job
router.get('/:id/candidates', [param('id').isUUID()], async (req, res) => {
  try {
    const data = await crm.request('GET',
      `/modules/Opportunities/${req.params.id}/relationships/contacts`
    );
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/jobs
router.post('/', [
  body('title').notEmpty().trim(),
  body('clientName').notEmpty().trim(),
  body('stage').optional().isIn(JOB_STAGES),
  body('jobType').optional().isIn(['Permanent', 'Contract', 'Fixed-Term', 'Interim']),
  body('location').optional().trim(),
  body('remotePolicy').optional().isIn(['On-site', 'Hybrid', 'Remote', 'Flexible']),
  body('salaryFrom').optional().isNumeric(),
  body('salaryTo').optional().isNumeric(),
  body('techRequirements').optional().trim(),
  body('seniority').optional().isIn(['Graduate', 'Junior', 'Mid', 'Senior', 'Staff', 'Principal', 'Director', 'VP', 'C-Suite']),
  body('feePercentage').optional().isFloat({ min: 0, max: 100 }),
  body('targetCloseDate').optional().isISO8601(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const data = await crm.createJob(req.body);
    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// PATCH /api/jobs/:id
router.patch('/:id', [
  param('id').isUUID(),
  body('stage').optional().isIn(JOB_STAGES),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const fieldMap = {
      title: 'name', clientName: 'account_name', stage: 'sales_stage',
      estimatedFee: 'amount', targetCloseDate: 'close_date',
      description: 'description', jobType: 'job_type_c',
      location: 'location_c', remotePolicy: 'remote_policy_c',
      salaryFrom: 'salary_from_c', salaryTo: 'salary_to_c',
      techRequirements: 'tech_requirements_c', seniority: 'seniority_c',
      feePercentage: 'fee_percentage_c',
    };

    const attrs = {};
    Object.entries(req.body).forEach(([k, v]) => {
      if (fieldMap[k]) attrs[fieldMap[k]] = v;
    });

    const data = await crm.update('Opportunities', req.params.id, attrs);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// DELETE /api/jobs/:id
router.delete('/:id', [param('id').isUUID()], async (req, res) => {
  try {
    await crm.delete('Opportunities', req.params.id);
    res.status(204).end();
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
