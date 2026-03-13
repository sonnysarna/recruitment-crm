'use strict';

/**
 * SuiteCRM V8 API Client
 * Wraps SuiteCRM's OAuth2 REST API with recruitment-specific helpers
 */

const axios = require('axios');

class SuiteCRMClient {
  constructor() {
    this.baseUrl = process.env.SUITECRM_URL || 'http://suitecrm:8080';
    this.clientId = process.env.SUITECRM_CLIENT_ID;
    this.clientSecret = process.env.SUITECRM_CLIENT_SECRET;
    this.adminUser = process.env.SUITECRM_ADMIN_USER;
    this.adminPassword = process.env.SUITECRM_ADMIN_PASSWORD;
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  // ── Auth ─────────────────────────────────────────────────
  async getToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const res = await axios.post(`${this.baseUrl}/api/oauth2/token`, {
        grant_type: 'password',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        username: this.adminUser,
        password: this.adminPassword,
      }, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

      this.accessToken = res.data.access_token;
      this.tokenExpiry = Date.now() + (res.data.expires_in - 60) * 1000;
      return this.accessToken;
    } catch (err) {
      global.logger.error('SuiteCRM auth failed:', err.message);
      throw new Error('SuiteCRM authentication failed');
    }
  }

  async request(method, path, data = null, params = {}) {
    const token = await this.getToken();
    const url = `${this.baseUrl}/api/v8${path}`;

    try {
      const res = await axios({
        method,
        url,
        params,
        data,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/vnd.api+json',
          Accept: 'application/vnd.api+json',
        },
        timeout: 15000,
      });
      return res.data;
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.errors?.[0]?.detail || err.message;
      global.logger.error(`SuiteCRM API error [${method} ${path}]: ${status} — ${detail}`);
      throw Object.assign(new Error(detail), { status: status || 502 });
    }
  }

  // ── Generic CRUD helpers ─────────────────────────────────
  async list(module, filters = {}, page = 1, pageSize = 20, sort = '-date_entered') {
    const params = {
      'page[number]': page,
      'page[size]': pageSize,
      sort,
    };
    if (filters.search) params['filter[operator]'] = 'and';

    return this.request('GET', `/modules/${module}`, null, params);
  }

  async get(module, id) {
    return this.request('GET', `/modules/${module}/${id}`);
  }

  async create(module, attributes) {
    return this.request('POST', `/modules/${module}`, {
      data: { type: module, attributes },
    });
  }

  async update(module, id, attributes) {
    return this.request('PATCH', `/modules/${module}/${id}`, {
      data: { type: module, id, attributes },
    });
  }

  async delete(module, id) {
    return this.request('DELETE', `/modules/${module}/${id}`);
  }

  // ── Recruitment-specific helpers ─────────────────────────

  // Candidates (mapped to SuiteCRM Contacts)
  async listCandidates(filters = {}, page = 1) {
    const params = {
      'page[number]': page,
      'page[size]': 25,
      'sort': '-date_entered',
      'fields[Contacts]': [
        'first_name', 'last_name', 'email1', 'phone_mobile',
        'title', 'department', 'account_name', 'description',
        // Custom recruitment fields
        'candidate_status_c', 'notice_period_c', 'salary_current_c',
        'salary_expected_c', 'tech_stack_c', 'github_url_c',
        'linkedin_url_c', 'arxiv_url_c', 'availability_c',
        'specialisation_c', 'date_entered', 'date_modified',
      ].join(','),
    };

    if (filters.status) params['filter[candidate_status_c]'] = filters.status;
    if (filters.specialisation) params['filter[specialisation_c]'] = filters.specialisation;
    if (filters.search) {
      params['filter[search][operator]'] = 'contains';
      params['filter[search][value]'] = filters.search;
    }

    return this.request('GET', '/modules/Contacts', null, params);
  }

  async createCandidate(data) {
    return this.create('Contacts', {
      first_name: data.firstName,
      last_name: data.lastName,
      email1: data.email,
      phone_mobile: data.phone,
      title: data.currentTitle,
      account_name: data.currentEmployer,
      description: data.notes,
      candidate_status_c: data.status || 'Active',
      notice_period_c: data.noticePeriod,
      salary_current_c: data.salaryCurrent,
      salary_expected_c: data.salaryExpected,
      tech_stack_c: data.techStack,
      github_url_c: data.githubUrl,
      linkedin_url_c: data.linkedinUrl,
      arxiv_url_c: data.arxivUrl,
      availability_c: data.availability,
      specialisation_c: data.specialisation,
    });
  }

  // Jobs (mapped to SuiteCRM Opportunities)
  async listJobs(filters = {}, page = 1) {
    const params = {
      'page[number]': page,
      'page[size]': 25,
      'sort': '-date_entered',
      'fields[Opportunities]': [
        'name', 'account_name', 'sales_stage', 'amount',
        'close_date', 'description',
        'job_type_c', 'location_c', 'remote_policy_c',
        'salary_from_c', 'salary_to_c', 'tech_requirements_c',
        'seniority_c', 'fee_percentage_c', 'date_entered',
      ].join(','),
    };

    if (filters.stage) params['filter[sales_stage]'] = filters.stage;
    if (filters.search) params['filter[name][operator]'] = 'contains', params['filter[name][value]'] = filters.search;

    return this.request('GET', '/modules/Opportunities', null, params);
  }

  async createJob(data) {
    return this.create('Opportunities', {
      name: data.title,
      account_name: data.clientName,
      sales_stage: data.stage || 'Briefed',
      amount: data.estimatedFee,
      close_date: data.targetCloseDate,
      description: data.description,
      job_type_c: data.jobType,
      location_c: data.location,
      remote_policy_c: data.remotePolicy,
      salary_from_c: data.salaryFrom,
      salary_to_c: data.salaryTo,
      tech_requirements_c: data.techRequirements,
      seniority_c: data.seniority,
      fee_percentage_c: data.feePercentage,
    });
  }

  // Clients (mapped to SuiteCRM Accounts)
  async listClients(filters = {}, page = 1) {
    const params = {
      'page[number]': page,
      'page[size]': 25,
      'sort': '-date_entered',
      'fields[Accounts]': [
        'name', 'industry', 'website', 'phone_office',
        'billing_address_city', 'billing_address_country',
        'description', 'account_type', 'annual_revenue',
        'client_tier_c', 'client_status_c', 'bd_owner_c',
        'date_entered',
      ].join(','),
    };

    return this.request('GET', '/modules/Accounts', null, params);
  }

  // Placements (mapped to SuiteCRM Cases)
  async createPlacement(data) {
    return this.create('Cases', {
      name: `Placement: ${data.candidateName} at ${data.clientName}`,
      account_name: data.clientName,
      status: 'Confirmed',
      description: data.notes,
      placement_candidate_c: data.candidateId,
      placement_job_c: data.jobId,
      start_date_c: data.startDate,
      salary_placed_c: data.salary,
      fee_amount_c: data.feeAmount,
      fee_paid_c: data.feePaid || false,
      guarantee_period_c: data.guaranteePeriod,
    });
  }

  // Activities (Calls + Meetings)
  async logActivity(type, data) {
    const module = type === 'call' ? 'Calls' : 'Meetings';
    return this.create(module, {
      name: data.subject,
      status: data.status || 'Held',
      date_start: data.date,
      duration_hours: data.durationHours || 0,
      duration_minutes: data.durationMinutes || 30,
      description: data.notes,
      direction: data.direction || 'Outbound',
    });
  }
}

// Singleton
module.exports = new SuiteCRMClient();
