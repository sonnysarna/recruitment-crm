'use strict';

const router = require('express').Router();
const { body, query, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const crm = require('../utils/suitecrm');

router.use(authenticate);

// GET /api/activities?type=call&page=1
router.get('/', [
  query('type').optional().isIn(['call', 'meeting', 'all']),
  query('page').optional().isInt({ min: 1 }),
], async (req, res) => {
  const { type = 'all', page = 1 } = req.query;
  try {
    const results = {};
    if (type === 'all' || type === 'call') {
      results.calls = await crm.list('Calls', {}, parseInt(page), 25, '-date_start');
    }
    if (type === 'all' || type === 'meeting') {
      results.meetings = await crm.list('Meetings', {}, parseInt(page), 25, '-date_start');
    }
    res.json(results);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// POST /api/activities — log a call or meeting
router.post('/', [
  body('type').isIn(['call', 'meeting']),
  body('subject').notEmpty().trim(),
  body('date').isISO8601(),
  body('notes').optional().trim(),
  body('durationMinutes').optional().isInt({ min: 1, max: 480 }),
  body('candidateId').optional().isUUID(),
  body('clientId').optional().isUUID(),
  body('jobId').optional().isUUID(),
  body('direction').optional().isIn(['Inbound', 'Outbound']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const activity = await crm.logActivity(req.body.type, req.body);

    // Link to related records if provided
    const activityId = activity?.data?.id;
    const module = req.body.type === 'call' ? 'Calls' : 'Meetings';

    if (activityId) {
      const links = [];
      if (req.body.candidateId) {
        links.push(crm.request('POST', `/modules/${module}/${activityId}/relationships/contacts`, {
          data: [{ type: 'Contacts', id: req.body.candidateId }],
        }));
      }
      if (req.body.clientId) {
        links.push(crm.request('POST', `/modules/${module}/${activityId}/relationships/accounts`, {
          data: [{ type: 'Accounts', id: req.body.clientId }],
        }));
      }
      if (req.body.jobId) {
        links.push(crm.request('POST', `/modules/${module}/${activityId}/relationships/opportunities`, {
          data: [{ type: 'Opportunities', id: req.body.jobId }],
        }));
      }
      await Promise.allSettled(links);
    }

    res.status(201).json(activity);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
