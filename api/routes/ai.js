'use strict';

const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const { authenticate } = require('../middleware/auth');
const crm = require('../utils/suitecrm');

router.use(authenticate);

let openai;
try {
  const OpenAI = require('openai');
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} catch {
  global.logger.warn('OpenAI not available — AI routes will return 503');
}

function requireOpenAI(req, res, next) {
  if (!openai || !process.env.OPENAI_API_KEY) {
    return res.status(503).json({
      error: 'AI features require OPENAI_API_KEY to be configured in .env',
    });
  }
  next();
}

// ── POST /api/ai/score-candidate ─────────────────────────────
// Score a candidate CV against a job spec
router.post('/score-candidate', requireOpenAI, [
  body('candidateId').optional().isUUID(),
  body('cvText').optional().isString(),
  body('jobId').optional().isUUID(),
  body('jobSpec').optional().isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    let cvText = req.body.cvText;
    let jobSpec = req.body.jobSpec;

    // Fetch from CRM if IDs provided
    if (req.body.candidateId && !cvText) {
      const candidate = await crm.get('Contacts', req.body.candidateId);
      const a = candidate?.data?.attributes || {};
      cvText = [
        `Name: ${a.first_name} ${a.last_name}`,
        `Current Role: ${a.title} at ${a.account_name}`,
        `Tech Stack: ${a.tech_stack_c}`,
        `Specialisation: ${a.specialisation_c}`,
        `Notes: ${a.description}`,
      ].join('\n');
    }

    if (req.body.jobId && !jobSpec) {
      const job = await crm.get('Opportunities', req.body.jobId);
      const a = job?.data?.attributes || {};
      jobSpec = [
        `Role: ${a.name}`,
        `Client: ${a.account_name}`,
        `Seniority: ${a.seniority_c}`,
        `Tech Requirements: ${a.tech_requirements_c}`,
        `Location: ${a.location_c} (${a.remote_policy_c})`,
        `Salary: £${a.salary_from_c} - £${a.salary_to_c}`,
        `Description: ${a.description}`,
      ].join('\n');
    }

    if (!cvText || !jobSpec) {
      return res.status(400).json({ error: 'Provide either candidateId/jobId or cvText/jobSpec' });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a specialist technical recruiter in Physical AI, Robotics, and Engineering.
Your job is to score candidate fit for a role and provide actionable insights.
Always respond with valid JSON only — no markdown, no prose.`,
        },
        {
          role: 'user',
          content: `Score this candidate for this role.

JOB SPEC:
${jobSpec}

CANDIDATE PROFILE:
${cvText}

Respond with JSON:
{
  "overallScore": 0-100,
  "technicalFit": 0-100,
  "seniorityFit": 0-100,
  "locationFit": 0-100,
  "strengths": ["string", ...],
  "gaps": ["string", ...],
  "inferredSkills": ["skill tags inferred but not stated", ...],
  "recommendedAction": "Approach" | "Submit" | "Hold" | "Reject",
  "summary": "2-3 sentence summary for the recruiter"
}`,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content);
    res.json({ score: result, model: completion.model });

  } catch (err) {
    global.logger.error('AI score error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/infer-skills ────────────────────────────────
// Extract and infer technical skills from CV text
router.post('/infer-skills', requireOpenAI, [
  body('text').notEmpty().isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a specialist in Physical AI and Robotics engineering talent. Extract and infer skills from candidate text. Respond with JSON only.',
        },
        {
          role: 'user',
          content: `Extract explicit and INFERRED skills from this text.
If someone mentions "ROS2" and "NVIDIA Jetson", infer "Edge AI" and "Physical Robotics" even if not stated.

TEXT: ${req.body.text}

Respond with JSON:
{
  "explicit": ["skills directly mentioned"],
  "inferred": ["skills reasonably inferred"],
  "subsystems": ["Perception", "Controls", "Motion Planning", "Manipulation", "Simulation", "Embedded", "Edge AI"],
  "hardwareExperience": ["hardware platforms mentioned or inferred"],
  "programmingLanguages": ["languages mentioned"],
  "frameworks": ["frameworks/tools mentioned"],
  "seniority": "Graduate|Junior|Mid|Senior|Staff|Principal",
  "specialisation": "most specific specialisation label"
}`,
        },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/draft-outreach ──────────────────────────────
// Draft a personalised outreach message
router.post('/draft-outreach', requireOpenAI, [
  body('candidateId').optional().isUUID(),
  body('jobId').optional().isUUID(),
  body('channel').isIn(['email', 'linkedin', 'sms']),
  body('tone').optional().isIn(['professional', 'casual', 'technical']),
  body('context').optional().isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    let candidateContext = '';
    let jobContext = '';

    if (req.body.candidateId) {
      const c = await crm.get('Contacts', req.body.candidateId);
      const a = c?.data?.attributes || {};
      candidateContext = `Candidate: ${a.first_name} ${a.last_name}, ${a.title} at ${a.account_name}. Tech: ${a.tech_stack_c}.`;
    }

    if (req.body.jobId) {
      const j = await crm.get('Opportunities', req.body.jobId);
      const a = j?.data?.attributes || {};
      jobContext = `Role: ${a.name} at ${a.account_name}. ${a.seniority_c}. ${a.location_c} (${a.remote_policy_c}). ${a.tech_requirements_c}.`;
    }

    const channelInstructions = {
      email: 'Write a subject line and email body. Max 150 words. No spam language.',
      linkedin: 'Write a LinkedIn connection request note. Max 300 characters.',
      sms: 'Write an SMS message. Max 160 characters. Friendly and brief.',
    };

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a specialist recruiter in Physical AI and Robotics. Write personalised, human outreach messages that don't sound like templates. Be specific. Respond with JSON only.`,
        },
        {
          role: 'user',
          content: `Draft a ${req.body.tone || 'professional'} ${req.body.channel} outreach message.
${channelInstructions[req.body.channel]}

${candidateContext}
${jobContext}
${req.body.context || ''}

Respond with JSON:
{
  "subject": "email subject (omit for SMS/LinkedIn)",
  "message": "the message body",
  "callToAction": "suggested next step",
  "alternativeVariant": "a shorter alternative version"
}`,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content);
    res.json({ ...result, channel: req.body.channel });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/ai/extract-intake ──────────────────────────────
// Extract structured data from an intake call transcript
router.post('/extract-intake', requireOpenAI, [
  body('transcript').notEmpty().isString(),
  body('type').isIn(['candidate', 'client']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  try {
    const isCandidate = req.body.type === 'candidate';
    const schema = isCandidate ? `{
  "noticePeriod": "e.g. 1 month",
  "salaryExpected": number or null,
  "motivations": ["list of motivations mentioned"],
  "concerns": ["list of concerns mentioned"],
  "preferredLocations": ["cities/regions"],
  "remotePreference": "On-site|Hybrid|Remote|Flexible",
  "availability": "date or description",
  "techHighlights": ["key tech skills mentioned in conversation"],
  "redFlags": ["any concerns raised"],
  "recommendedAction": "Shortlist|Hold|Reject",
  "summary": "3-4 sentence summary for the file"
}` : `{
  "roleTitle": "string",
  "teamSize": "string",
  "reportingTo": "string",
  "budgetConfirmed": boolean,
  "salaryRange": "string",
  "urgency": "Immediate|30 days|60 days|3+ months",
  "mustHaveSkills": ["list"],
  "niceToHaveSkills": ["list"],
  "interviewProcess": ["stage 1", "stage 2", ...],
  "decisionMakers": ["names/titles"],
  "competingAgencies": boolean,
  "exclusivity": boolean,
  "summary": "3-4 sentence summary"
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a specialist recruiter assistant. Extract structured data from intake call transcripts. Respond with JSON only.',
        },
        {
          role: 'user',
          content: `Extract key information from this ${req.body.type} intake call transcript.

TRANSCRIPT:
${req.body.transcript.slice(0, 8000)}

Respond with this exact JSON schema:
${schema}`,
        },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0].message.content);
    res.json({ extracted: result, type: req.body.type });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
