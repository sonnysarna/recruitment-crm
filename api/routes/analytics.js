'use strict';

const router = require('express').Router();
const { query, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const crm = require('../utils/suitecrm');

router.use(authenticate);

/**
 * Revenue analytics endpoints — Source of Profit tracking
 */

// GET /api/analytics/revenue?year=2026&quarter=Q1
router.get('/revenue', [
  query('year').optional().isInt({ min: 2020 }),
  query('quarter').optional().isIn(['Q1', 'Q2', 'Q3', 'Q4']),
], async (req, res) => {
  try {
    const { year = new Date().getFullYear(), quarter } = req.query;

    // Pull all confirmed placements
    const placements = await crm.request('GET', '/modules/Cases', null, {
      'filter[status]': 'Confirmed',
      'fields[Cases]': 'name,account_name,fee_amount_c,fee_paid_c,start_date_c,placement_job_c,date_entered',
      'page[size]': 100,
      'sort': '-date_entered',
    });

    // Basic revenue aggregation — enhance with DB queries for production
    const items = placements?.data || [];

    let totalFees = 0;
    let paidFees = 0;
    let pendingFees = 0;
    const byClient = {};
    const byMonth = {};

    items.forEach(item => {
      const attrs = item.attributes || {};
      const fee = parseFloat(attrs.fee_amount_c || 0);
      const client = attrs.account_name || 'Unknown';
      const month = (attrs.start_date_c || attrs.date_entered || '').slice(0, 7);

      totalFees += fee;
      if (attrs.fee_paid_c) paidFees += fee;
      else pendingFees += fee;

      byClient[client] = (byClient[client] || 0) + fee;
      if (month) byMonth[month] = (byMonth[month] || 0) + fee;
    });

    // Sort clients by revenue (Source of Profit)
    const sourceOfProfit = Object.entries(byClient)
      .map(([client, revenue]) => ({ client, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    res.json({
      summary: {
        totalFees,
        paidFees,
        pendingFees,
        placementCount: items.length,
        avgFeePerPlacement: items.length > 0 ? Math.round(totalFees / items.length) : 0,
      },
      sourceOfProfit,
      revenueByMonth: Object.entries(byMonth)
        .map(([month, revenue]) => ({ month, revenue }))
        .sort((a, b) => a.month.localeCompare(b.month)),
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/analytics/pipeline — pipeline value and stage breakdown
router.get('/pipeline', async (req, res) => {
  try {
    const jobs = await crm.request('GET', '/modules/Opportunities', null, {
      'fields[Opportunities]': 'name,sales_stage,amount,account_name,close_date',
      'page[size]': 200,
    });

    const items = jobs?.data || [];
    const byStage = {};
    let totalValue = 0;

    items.forEach(item => {
      const attrs = item.attributes || {};
      const stage = attrs.sales_stage || 'Unknown';
      const val = parseFloat(attrs.amount || 0);

      if (!byStage[stage]) byStage[stage] = { count: 0, value: 0 };
      byStage[stage].count++;
      byStage[stage].value += val;
      totalValue += val;
    });

    res.json({
      totalPipelineValue: totalValue,
      totalJobs: items.length,
      byStage: Object.entries(byStage).map(([stage, data]) => ({
        stage,
        count: data.count,
        value: data.value,
        percentage: totalValue > 0 ? Math.round((data.value / totalValue) * 100) : 0,
      })).sort((a, b) => b.value - a.value),
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/analytics/activity — recruiter activity summary
router.get('/activity', async (req, res) => {
  try {
    const [calls, meetings] = await Promise.all([
      crm.request('GET', '/modules/Calls', null, { 'page[size]': 100, 'sort': '-date_start' }),
      crm.request('GET', '/modules/Meetings', null, { 'page[size]': 100, 'sort': '-date_start' }),
    ]);

    const totalCalls = calls?.data?.length || 0;
    const totalMeetings = meetings?.data?.length || 0;

    res.json({
      totalCalls,
      totalMeetings,
      totalActivities: totalCalls + totalMeetings,
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// GET /api/analytics/dashboard — single endpoint for dashboard widgets
router.get('/dashboard', async (req, res) => {
  try {
    const [revenueRes, pipelineRes, candidatesRes, jobsRes] = await Promise.allSettled([
      crm.list('Cases', {}, 1, 100),
      crm.list('Opportunities', {}, 1, 200),
      crm.list('Contacts', {}, 1, 1),
      crm.list('Opportunities', {}, 1, 1),
    ]);

    const placements = revenueRes.value?.data || [];
    const jobs = pipelineRes.value?.data || [];

    const totalRevenue = placements.reduce((sum, p) =>
      sum + parseFloat(p.attributes?.fee_amount_c || 0), 0);

    const activeJobs = jobs.filter(j =>
      !['Placed', 'Cancelled'].includes(j.attributes?.sales_stage)).length;

    res.json({
      revenue: { total: totalRevenue, placements: placements.length },
      pipeline: { activeJobs },
      candidates: { total: candidatesRes.value?.meta?.total || 0 },
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
