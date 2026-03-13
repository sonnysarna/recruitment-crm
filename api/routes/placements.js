'use strict';

const router = require('express').Router();
const { body, param, query, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const crm = require('../utils/suitecrm');

router.use(authenticate);

// GET /api/placements
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('feePaid').optional().isBoolean(),
  query('year').optional().isInt({ min: 2020 }),
], async (req, res) => {
  try {
    const params = {
      'page[number]': req.query.page || 1,
      'page[size]': 25,
      'sort': '-date_entered',
      'fields[Cases]': [
        'name', 'account_name', 'status', 'description',
        'placement_candidate_c', 'placement_job_c',
        'start_date_c', 'salary_placed_c', 'fee_amount_c',
        'fee_paid_c', 'guarantee_period_c', 'date_entered',
      ].join(','),
    };

    if (req.query.feePaid !== undefined) {
      params['filter[fee_paid_c]'] = req.query.feePaid === 'true' ? '1' : '0';
    }

    const data = await crm.request('GET', '/modules/Cases', null, params);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/placements/:id
router.get('/:id', [param('id').isUUID()], async (req, res) => {
  try {
    const data = await crm.get('Cases', req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/placements
router.post('/', [
  body('candidateName').notEmpty().trim(),
  body('candidateId').isUUID(),
  body('clientName').notEmpty().trim(),
  body('jobId').isUUID(),
  body('salary').isNumeric(),
  body('feeAmount').isNumeric(),
  body('startDate').isISO8601(),
  body('guaranteePeriod').optional().isInt({ min: 0 }),
  body('notes').optional().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const data = await crm.createPlacement(req.body);

    // Also update the job stage to Placed
    await crm.update('Opportunities', req.body.jobId, { sales_stage: 'Placed' });

    // Update candidate status to Placed
    await crm.update('Contacts', req.body.candidateId, { candidate_status_c: 'Placed' });

    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// PATCH /api/placements/:id/fee-paid — mark fee as received
router.patch('/:id/fee-paid', [param('id').isUUID()], async (req, res) => {
  try {
    const data = await crm.update('Cases', req.params.id, {
      fee_paid_c: true,
      fee_paid_date_c: new Date().toISOString().split('T')[0],
    });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
