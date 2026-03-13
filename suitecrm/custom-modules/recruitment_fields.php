<?php
/**
 * Custom Recruitment Fields for SuiteCRM
 *
 * Run via Admin > Studio OR deploy via:
 *   php -f custom_deploy.php (inside SuiteCRM container)
 *
 * Fields are added to:
 *  - Contacts (Candidates)
 *  - Opportunities (Jobs)
 *  - Accounts (Clients)
 *  - Cases (Placements)
 */

// ── CONTACTS (Candidates) ─────────────────────────────────────
$fields_contacts = [
    'candidate_status_c' => [
        'label' => 'Candidate Status',
        'type' => 'enum',
        'options' => 'candidate_status_list',
        'default' => 'Active',
    ],
    'notice_period_c' => [
        'label' => 'Notice Period',
        'type' => 'varchar',
        'len' => 50,
    ],
    'salary_current_c' => [
        'label' => 'Current Salary (£)',
        'type' => 'currency',
    ],
    'salary_expected_c' => [
        'label' => 'Expected Salary (£)',
        'type' => 'currency',
    ],
    'tech_stack_c' => [
        'label' => 'Technical Stack',
        'type' => 'text',
    ],
    'specialisation_c' => [
        'label' => 'Specialisation',
        'type' => 'enum',
        'options' => 'specialisation_list',
    ],
    'github_url_c' => [
        'label' => 'GitHub Profile URL',
        'type' => 'url',
        'len' => 255,
    ],
    'linkedin_url_c' => [
        'label' => 'LinkedIn URL',
        'type' => 'url',
        'len' => 255,
    ],
    'arxiv_url_c' => [
        'label' => 'arXiv Author URL',
        'type' => 'url',
        'len' => 255,
    ],
    'availability_c' => [
        'label' => 'Available From',
        'type' => 'date',
    ],
    'ai_score_c' => [
        'label' => 'AI Match Score (Last)',
        'type' => 'integer',
    ],
    'inferred_skills_c' => [
        'label' => 'Inferred Skills (AI)',
        'type' => 'text',
    ],
];

// ── OPPORTUNITIES (Jobs) ──────────────────────────────────────
$fields_opportunities = [
    'job_type_c' => [
        'label' => 'Job Type',
        'type' => 'enum',
        'options' => 'job_type_list',
        'default' => 'Permanent',
    ],
    'location_c' => [
        'label' => 'Location',
        'type' => 'varchar',
        'len' => 100,
    ],
    'remote_policy_c' => [
        'label' => 'Remote Policy',
        'type' => 'enum',
        'options' => 'remote_policy_list',
        'default' => 'Hybrid',
    ],
    'salary_from_c' => [
        'label' => 'Salary From (£)',
        'type' => 'currency',
    ],
    'salary_to_c' => [
        'label' => 'Salary To (£)',
        'type' => 'currency',
    ],
    'tech_requirements_c' => [
        'label' => 'Technical Requirements',
        'type' => 'text',
    ],
    'seniority_c' => [
        'label' => 'Seniority Level',
        'type' => 'enum',
        'options' => 'seniority_list',
    ],
    'fee_percentage_c' => [
        'label' => 'Fee (%)',
        'type' => 'decimal',
        'len' => 5,
        'precision' => 2,
    ],
];

// ── ACCOUNTS (Clients) ────────────────────────────────────────
$fields_accounts = [
    'client_tier_c' => [
        'label' => 'Client Tier',
        'type' => 'enum',
        'options' => 'client_tier_list',
        'default' => 'Prospect',
    ],
    'client_status_c' => [
        'label' => 'Client Status',
        'type' => 'enum',
        'options' => 'client_status_list',
        'default' => 'Prospect',
    ],
    'bd_owner_c' => [
        'label' => 'BD Owner',
        'type' => 'varchar',
        'len' => 100,
    ],
    'fill_rate_c' => [
        'label' => 'Fill Rate (%)',
        'type' => 'decimal',
    ],
    'total_revenue_c' => [
        'label' => 'Total Revenue Generated (£)',
        'type' => 'currency',
    ],
];

// ── CASES (Placements) ────────────────────────────────────────
$fields_cases = [
    'placement_candidate_c' => [
        'label' => 'Candidate ID',
        'type' => 'relate',
        'module' => 'Contacts',
    ],
    'placement_job_c' => [
        'label' => 'Job ID',
        'type' => 'relate',
        'module' => 'Opportunities',
    ],
    'start_date_c' => [
        'label' => 'Start Date',
        'type' => 'date',
    ],
    'salary_placed_c' => [
        'label' => 'Salary at Placement (£)',
        'type' => 'currency',
    ],
    'fee_amount_c' => [
        'label' => 'Fee Amount (£)',
        'type' => 'currency',
    ],
    'fee_paid_c' => [
        'label' => 'Fee Paid',
        'type' => 'bool',
        'default' => false,
    ],
    'fee_paid_date_c' => [
        'label' => 'Fee Paid Date',
        'type' => 'date',
    ],
    'guarantee_period_c' => [
        'label' => 'Guarantee Period (days)',
        'type' => 'integer',
        'default' => 90,
    ],
    'guarantee_expires_c' => [
        'label' => 'Guarantee Expires',
        'type' => 'date',
    ],
];

// ── DROPDOWN LISTS ────────────────────────────────────────────
$app_list_strings['candidate_status_list'] = [
    'Active'          => 'Active',
    'Passive'         => 'Passive',
    'Placed'          => 'Placed',
    'Off-Limits'      => 'Off-Limits',
    'Do Not Contact'  => 'Do Not Contact',
];

$app_list_strings['specialisation_list'] = [
    'Robotics Software'          => 'Robotics Software',
    'Controls Engineering'       => 'Controls Engineering',
    'Mechatronics'               => 'Mechatronics',
    'Perception & Computer Vision' => 'Perception & Computer Vision',
    'Motion Planning'            => 'Motion Planning',
    'Edge AI'                    => 'Edge AI',
    'Embedded Systems'           => 'Embedded Systems',
    'Simulation'                 => 'Simulation',
    'ROS/ROS2'                   => 'ROS/ROS2',
    'Physical AI'                => 'Physical AI',
    'Automation Engineering'     => 'Automation Engineering',
    'Hardware Engineering'       => 'Hardware Engineering',
    'Other'                      => 'Other',
];

$app_list_strings['job_type_list'] = [
    'Permanent'   => 'Permanent',
    'Contract'    => 'Contract',
    'Fixed-Term'  => 'Fixed-Term',
    'Interim'     => 'Interim',
];

$app_list_strings['remote_policy_list'] = [
    'On-site'  => 'On-site',
    'Hybrid'   => 'Hybrid',
    'Remote'   => 'Remote',
    'Flexible' => 'Flexible',
];

$app_list_strings['seniority_list'] = [
    'Graduate'  => 'Graduate',
    'Junior'    => 'Junior',
    'Mid'       => 'Mid',
    'Senior'    => 'Senior',
    'Staff'     => 'Staff',
    'Principal' => 'Principal',
    'Director'  => 'Director',
    'VP'        => 'VP',
    'C-Suite'   => 'C-Suite',
];

$app_list_strings['client_tier_list'] = [
    'A'        => 'A — Top Client',
    'B'        => 'B — Active Client',
    'C'        => 'C — Occasional',
    'Prospect' => 'Prospect',
];

$app_list_strings['client_status_list'] = [
    'Active'          => 'Active',
    'Inactive'        => 'Inactive',
    'Prospect'        => 'Prospect',
    'Do Not Contact'  => 'Do Not Contact',
];
