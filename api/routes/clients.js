'use strict';

const router = require('express').Router();
const { body, param, query, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const crm = require('../utils/suitecrm');

router.use(authenticate);

// GET /api/clients
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('search').optional().isString().trim(),
  query('tier').optional().isIn(['A', 'B', 'C', 'Prospect']),
], async (req, res) => {
  try {
    const { search, tier, page = 1 } = req.query;
    const data = await crm.listClients({ search, tier }, parseInt(page));
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/clients/:id
router.get('/:id', [param('id').isUUID()], async (req, res) => {
  try {
    const data = await crm.get('Accounts', req.params.id);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/clients/:id/jobs — all open jobs for this client
router.get('/:id/jobs', [param('id').isUUID()], async (req, res) => {
  try {
    const data = await crm.request('GET',
      `/modules/Accounts/${req.params.id}/relationships/opportunities`
    );
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/clients
router.post('/', [
  body('name').notEmpty().trim(),
  body('industry').optional().trim(),
  body('website').optional().isURL(),
  body('phone').optional().trim(),
  body('city').optional().trim(),
  body('country').optional().trim(),
  body('tier').optional().isIn(['A', 'B', 'C', 'Prospect']),
  body('status').optional().isIn(['Active', 'Inactive', 'Prospect', 'Do Not Contact']),
  body('bdOwner').optional().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const data = await crm.create('Accounts', {
      name: req.body.name,
      industry: req.body.industry,
      website: req.body.website,
      phone_office: req.body.phone,
      billing_address_city: req.body.city,
      billing_address_country: req.body.country,
      description: req.body.notes,
      client_tier_c: req.body.tier || 'Prospect',
      client_status_c: req.body.status || 'Prospect',
      bd_owner_c: req.body.bdOwner,
    });
    res.status(201).json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// PATCH /api/clients/:id
router.patch('/:id', [param('id').isUUID()], async (req, res) => {
  try {
    const fieldMap = {
      name: 'name', industry: 'industry', website: 'website',
      phone: 'phone_office', city: 'billing_address_city',
      country: 'billing_address_country', notes: 'description',
      tier: 'client_tier_c', status: 'client_status_c', bdOwner: 'bd_owner_c',
    };
    const attrs = {};
    Object.entries(req.body).forEach(([k, v]) => {
      if (fieldMap[k]) attrs[fieldMap[k]] = v;
    });
    const data = await crm.update('Accounts', req.params.id, attrs);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
