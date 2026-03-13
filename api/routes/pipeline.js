'use strict';

const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const crm = require('../utils/suitecrm');

router.use(authenticate);

/**
 * GET /api/pipeline
 * Returns a unified Kanban-style pipeline view
 * showing all active jobs with their associated candidates by stage
 */
router.get('/', async (req, res) => {
  try {
    // Fetch all active jobs
    const jobsData = await crm.request('GET', '/modules/Opportunities', null, {
      'filter[sales_stage][operator]': 'not_in',
      'filter[sales_stage][value]': 'Placed,Cancelled',
      'fields[Opportunities]': 'name,account_name,sales_stage,salary_from_c,salary_to_c,seniority_c,location_c,remote_policy_c,tech_requirements_c',
      'page[size]': 100,
    });

    const jobs = jobsData?.data || [];

    // For each job, fetch linked candidates
    const jobsWithCandidates = await Promise.all(
      jobs.map(async (job) => {
        try {
          const candidatesData = await crm.request('GET',
            `/modules/Opportunities/${job.id}/relationships/contacts`,
            null,
            { 'fields[Contacts]': 'first_name,last_name,email1,title,candidate_status_c,linkedin_url_c' }
          );
          return {
            ...job,
            candidates: candidatesData?.data || [],
          };
        } catch {
          return { ...job, candidates: [] };
        }
      })
    );

    // Group by stage for Kanban
    const stages = [
      'Briefed', 'Sourcing', 'Longlisting', 'Shortlisting',
      'Interviewing', 'Offer Stage',
    ];

    const kanban = stages.reduce((acc, stage) => {
      acc[stage] = jobsWithCandidates.filter(j => j.attributes?.sales_stage === stage);
      return acc;
    }, {});

    res.json({
      stages,
      pipeline: kanban,
      totals: {
        jobs: jobs.length,
        candidatesInPipeline: jobsWithCandidates.reduce((sum, j) => sum + j.candidates.length, 0),
      },
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * PATCH /api/pipeline/jobs/:jobId/stage
 * Move a job to a different pipeline stage
 */
router.patch('/jobs/:jobId/stage', async (req, res) => {
  const { stage } = req.body;
  const validStages = [
    'Briefed', 'Sourcing', 'Longlisting', 'Shortlisting',
    'Interviewing', 'Offer Stage', 'Placed', 'On Hold', 'Cancelled',
  ];

  if (!stage || !validStages.includes(stage)) {
    return res.status(400).json({ error: `Invalid stage. Must be one of: ${validStages.join(', ')}` });
  }

  try {
    const data = await crm.update('Opportunities', req.params.jobId, { sales_stage: stage });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * PATCH /api/pipeline/candidates/:candidateId/stage
 * Move a candidate to a different stage within a job
 */
router.patch('/candidates/:candidateId/stage', async (req, res) => {
  const { stage, jobId } = req.body;
  const validStages = [
    'Identified', 'Approached', 'Interested', 'Submitted',
    'Interviewing', 'Offered', 'Placed', 'Rejected', 'Withdrawn',
  ];

  if (!stage || !validStages.includes(stage)) {
    return res.status(400).json({ error: `Invalid stage. Must be one of: ${validStages.join(', ')}` });
  }

  try {
    // Update candidate status
    await crm.update('Contacts', req.params.candidateId, {
      candidate_status_c: stage === 'Placed' ? 'Placed' : 'Active',
    });

    // Update the relationship meta if jobId provided
    if (jobId) {
      await crm.request('PATCH',
        `/modules/Contacts/${req.params.candidateId}/relationships/opportunities`,
        { data: [{ type: 'Opportunities', id: jobId, meta: { stage } }] }
      );
    }

    res.json({ success: true, candidateId: req.params.candidateId, stage });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
