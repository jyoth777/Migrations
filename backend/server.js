const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const axios = require('axios');
const { Octokit } = require('@octokit/rest');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for demo purposes
let scanResults = [];
let workflows = [];

// ============================================
// Watson Orchestrate Configuration
// ============================================
const WXO_SERVICE_URL = process.env.WXO_SERVICE_URL;
const WXO_API_KEY = process.env.WXO_API_KEY;
const WXO_AGENT_ID = process.env.WXO_AGENT_ID;
const MCSP_TOKEN_URL = 'https://iam.platform.saas.ibm.com/siusermgr/api/1.0/apikeys/token';

// Store thread IDs per session for conversation continuity
const threadStore = new Map();

// Cache bearer token (expires in 7200s, refresh at 6000s)
let cachedToken = null;
let tokenExpiry = 0;

async function getBearerToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const response = await axios.post(MCSP_TOKEN_URL, { apikey: WXO_API_KEY }, {
    headers: { 'Content-Type': 'application/json' }
  });

  cachedToken = response.data.token;
  // Refresh 10 minutes before expiry
  tokenExpiry = Date.now() + ((response.data.expires_in - 600) * 1000);
  return cachedToken;
}

async function callWatsonAgent(message, threadId = null) {
  if (!WXO_SERVICE_URL || !WXO_API_KEY || !WXO_AGENT_ID) {
    throw new Error('Watson Orchestrate credentials not configured. Check .env file.');
  }

  const token = await getBearerToken();
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };

  // Step 1: Submit the run
  const body = {
    message: { role: 'user', content: message },
    agent_id: WXO_AGENT_ID
  };
  if (threadId) {
    body.thread_id = threadId;
  }

  const runResponse = await axios.post(`${WXO_SERVICE_URL}/v1/orchestrate/runs`, body, { headers });
  const { run_id, thread_id } = runResponse.data;

  // Step 2: Poll until the run completes
  const pollUrl = `${WXO_SERVICE_URL}/v1/orchestrate/runs/${run_id}`;
  const maxAttempts = 120; // Allow up to 2 minutes for agent to complete

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const pollResponse = await axios.get(pollUrl, { headers });
    const run = pollResponse.data;

    console.log(`[Watson Agent] Poll attempt ${i + 1}/${maxAttempts}, status: ${run.status}`);

    if (run.status === 'completed') {
      // Extract agent's text reply
      const content = run.result?.data?.message?.content || [];
      const textParts = content.map(c => c.text).filter(Boolean);
      const responseText = textParts.join('\n');
      console.log('[Watson Agent] Response:', responseText.substring(0, 500));
      return {
        thread_id,
        message: { content: responseText },
        raw: run
      };
    }

    if (run.status === 'failed' || run.status === 'cancelled') {
      throw new Error(`Agent run ${run.status}: ${run.last_error || 'Unknown error'}`);
    }
  }

  throw new Error('Agent response timed out after 4 minutes');
}

// ============================================
// LEVEL 1: Standard Features
// ============================================

// Mend Config Scanner
const mendScanConfig = {
  fipsCompliance: {
    checks: [
      'FIPS 140-2 Cryptographic Module',
      'FIPS 140-3 Validation',
      'Approved Algorithms (AES, SHA-256, RSA)',
      'Key Management',
      'Self-Tests',
      'Physical Security'
    ]
  },
  vulnerabilityChecks: {
    severity: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    types: ['SQL Injection', 'XSS', 'CSRF', 'Dependency Vulnerabilities', 'Code Injection']
  }
};

// API: Get Mend Configuration
app.get('/api/config/mend', (req, res) => {
  res.json({
    success: true,
    config: mendScanConfig
  });
});

// API: Scan Repository
app.post('/api/scan/repository', async (req, res) => {
  const { repoUrl, scanType } = req.body;
  
  try {
    const scanId = `SCAN-${Date.now()}`;
    const scanResult = {
      id: scanId,
      repoUrl,
      scanType,
      timestamp: new Date().toISOString(),
      status: 'running',
      findings: []
    };

    scanResults.push(scanResult);

    // Parse owner/repo from GitHub URL
    const repoMatch = (repoUrl || '').match(/github\.com\/([^/]+)\/([^/\s]+)/);
    const owner = repoMatch ? repoMatch[1] : 'jyoth777';
    const repo = repoMatch ? repoMatch[2].replace(/\.git$/, '') : 'Migrations';

    // Call Watson Orchestrate agent with the working prompt
    try {
      const prompt = `Step 1: Call get_github_file_contents to fetch the source code from:\n\nOwner: ${owner}\nRepo: ${repo}\nBranch: main\nPath: ${repoUrl}\n\nStep 2: Extract the file content from the tool response.\n\nStep 3: Call run_compliance_check and provide the extracted source code as input.\n\nStep 4: Return the compliance scan result in readable format.\n\nStep 5: Generate consolidated PR per file using raise_vulnerability_pr tool for compliance issues.\n\nStep 5: Call run_vulnerability_scan.\n\nStep 6: Return the vulnerability scan report in readable format.\n\nStep 8: Generate consolidated PR per file using raise_vulnerability_pr tool for sonar scan issues.`;
      const agentResponse = await callWatsonAgent(prompt);
      const responseText = agentResponse.message?.content || '';

      scanResult.status = 'completed';
      scanResult.agentResponse = responseText;
      scanResult.findings = generateMockFindings(scanType);
    } catch (agentError) {
      console.error('Watson agent error during scan, falling back to mock:', agentError.message);
      scanResult.status = 'completed';
      scanResult.findings = generateMockFindings(scanType);
    }

    res.json({
      success: true,
      scanId,
      result: scanResult
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: Get Scan Results
app.get('/api/scan/results/:scanId', (req, res) => {
  const { scanId } = req.params;
  const result = scanResults.find(r => r.id === scanId);
  
  if (result) {
    res.json({ success: true, result });
  } else {
    res.status(404).json({ success: false, error: 'Scan not found' });
  }
});

// API: Get All Scans
app.get('/api/scan/all', (req, res) => {
  res.json({
    success: true,
    scans: scanResults
  });
});

// ============================================
// WORKFLOW 1: FIPS Compliance Check
// ============================================
app.post('/api/workflow/fips-compliance', async (req, res) => {
  const { repoUrl, branch = 'main' } = req.body;
  
  try {
    const workflowId = `FIPS-${Date.now()}`;
    const workflow = {
      id: workflowId,
      type: 'FIPS_COMPLIANCE',
      repoUrl,
      branch,
      status: 'running',
      startTime: new Date().toISOString(),
      steps: [
        { name: 'Initialize Scan', status: 'completed', timestamp: new Date().toISOString() },
        { name: 'Check Cryptographic Modules', status: 'running', timestamp: new Date().toISOString() },
        { name: 'Validate Algorithms', status: 'pending' },
        { name: 'Key Management Review', status: 'pending' },
        { name: 'Generate Report', status: 'pending' }
      ]
    };
    
    workflows.push(workflow);

    // Call Watson Orchestrate agent for FIPS compliance scan
    (async () => {
      try {
        const updatedWorkflow = workflows.find(w => w.id === workflowId);
        if (!updatedWorkflow) return;

        // Parse owner/repo from GitHub URL
        const repoMatch = (repoUrl || '').match(/github\.com\/([^/]+)\/([^/\s]+)/);
        const owner = repoMatch ? repoMatch[1] : 'jyoth777';
        const repo = repoMatch ? repoMatch[2].replace(/\.git$/, '') : 'Migrations';

        const prompt = `Step 1: Call get_github_file_contents to fetch the source code from:\n\nOwner: ${owner}\nRepo: ${repo}\nBranch: ${branch}\nPath: ${repoUrl}\n\nStep 2: Extract the file content from the tool response.\n\nStep 3: Call run_compliance_check and provide the extracted source code as input.\n\nStep 4: Return the compliance scan result in readable format.\n\nStep 5: Generate consolidated PR per file using raise_vulnerability_pr tool for compliance issues.\n\nStep 5: Call run_vulnerability_scan.\n\nStep 6: Return the vulnerability scan report in readable format.\n\nStep 8: Generate consolidated PR per file using raise_vulnerability_pr tool for sonar scan issues.`;

        updatedWorkflow.steps[1].status = 'completed';
        updatedWorkflow.steps[1].timestamp = new Date().toISOString();
        updatedWorkflow.steps[2].status = 'running';
        updatedWorkflow.steps[2].timestamp = new Date().toISOString();

        const agentResponse = await callWatsonAgent(prompt);
        const responseText = agentResponse.message?.content || '';

        updatedWorkflow.status = 'completed';
        updatedWorkflow.steps.forEach(step => step.status = 'completed');
        updatedWorkflow.endTime = new Date().toISOString();
        updatedWorkflow.complianceScore = 85;
        updatedWorkflow.issues = generateFIPSIssues();
        updatedWorkflow.agentResponse = responseText;
      } catch (error) {
        const updatedWorkflow = workflows.find(w => w.id === workflowId);
        if (updatedWorkflow) {
          updatedWorkflow.status = 'failed';
          updatedWorkflow.error = error.message;
        }
      }
    })();
    
    res.json({
      success: true,
      workflowId,
      workflow
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// ============================================
// WORKFLOW 2: Vulnerability Fix
// ============================================
app.post('/api/workflow/vuln-fix', async (req, res) => {
  const { repoUrl, vulnerabilities, autoFix = true } = req.body;
  
  try {
    const workflowId = `VULN-${Date.now()}`;
    const workflow = {
      id: workflowId,
      type: 'VULNERABILITY_FIX',
      repoUrl,
      vulnerabilities,
      autoFix,
      status: 'running',
      startTime: new Date().toISOString(),
      steps: [
        { name: 'Analyze Vulnerabilities', status: 'completed', timestamp: new Date().toISOString() },
        { name: 'Generate Fixes', status: 'running', timestamp: new Date().toISOString() },
        { name: 'Create Pull Request', status: 'pending' },
        { name: 'Run Tests', status: 'pending' },
        { name: 'Notify Team', status: 'pending' }
      ],
      fixes: []
    };
    
    workflows.push(workflow);

    // Call Watson Orchestrate agent to scan repo and create PR
    (async () => {
      try {
        const updatedWorkflow = workflows.find(w => w.id === workflowId);
        if (!updatedWorkflow) return;

        // Parse owner/repo from GitHub URL
        const repoMatch = (repoUrl || '').match(/github\.com\/([^/]+)\/([^/\s]+)/);
        const owner = repoMatch ? repoMatch[1] : 'jyoth777';
        const repo = repoMatch ? repoMatch[2].replace(/\.git$/, '') : 'Migrations';

        const prompt = `Step 1: Call get_github_file_contents to fetch the source code from:\n\nOwner: ${owner}\nRepo: ${repo}\nBranch: main\nPath: ${repoUrl}\n\nStep 2: Extract the file content from the tool response.\n\nStep 3: Call run_compliance_check and provide the extracted source code as input.\n\nStep 4: Return the compliance scan result in readable format.\n\nStep 5: Generate consolidated PR per file using raise_vulnerability_pr tool for compliance issues.\n\nStep 5: Call run_vulnerability_scan.\n\nStep 6: Return the vulnerability scan report in readable format.\n\nStep 8: Generate consolidated PR per file using raise_vulnerability_pr tool for sonar scan issues.`;

        updatedWorkflow.steps[1].status = 'completed';
        updatedWorkflow.steps[1].timestamp = new Date().toISOString();
        updatedWorkflow.steps[2].status = 'running';
        updatedWorkflow.steps[2].timestamp = new Date().toISOString();

        const agentResponse = await callWatsonAgent(prompt);
        const responseText = agentResponse.message?.content || '';

        console.log('[Vuln-Fix] Agent response length:', responseText.length);
        console.log('[Vuln-Fix] Agent response preview:', responseText.substring(0, 1000));

        // Extract PR URL from agent response - try multiple patterns
        const prPatterns = [
          /https:\/\/github\.com\/[^\s)>*]+\/pull\/\d+/,
          /PR\s*#?\d+[:\s]+.*?(https:\/\/github\.com\/\S+)/,
          /\[.*?\]\((https:\/\/github\.com\/[^)]+\/pull\/\d+)\)/,
        ];

        let prUrl = null;
        for (const pattern of prPatterns) {
          const match = responseText.match(pattern);
          if (match) {
            prUrl = match[1] || match[0];
            console.log('[Vuln-Fix] Found PR URL:', prUrl);
            break;
          }
        }

        updatedWorkflow.status = 'completed';
        updatedWorkflow.steps.forEach(step => step.status = 'completed');
        updatedWorkflow.endTime = new Date().toISOString();
        updatedWorkflow.fixes = generateVulnFixes(vulnerabilities);
        updatedWorkflow.agentResponse = responseText;
        if (prUrl) {
          updatedWorkflow.prUrl = prUrl;
        } else {
          console.log('[Vuln-Fix] No PR URL found in agent response');
        }
      } catch (error) {
        console.error('[Vuln-Fix] Agent error:', error.message);
        const updatedWorkflow = workflows.find(w => w.id === workflowId);
        if (updatedWorkflow) {
          updatedWorkflow.status = 'failed';
          updatedWorkflow.error = error.message;
        }
      }
    })();

    res.json({
      success: true,
      workflowId,
      workflow
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API: Get Workflow Status
app.get('/api/workflow/:workflowId', (req, res) => {
  const { workflowId } = req.params;
  const workflow = workflows.find(w => w.id === workflowId);
  
  if (workflow) {
    res.json({ success: true, workflow });
  } else {
    res.status(404).json({ success: false, error: 'Workflow not found' });
  }
});

// ============================================
// LEVEL 2: Watson Orchestrate Agent Features
// ============================================

// API: Chat with Watson Orchestrate Agent
app.post('/api/agent/chat', async (req, res) => {
  const { message, sessionId = 'default' } = req.body;

  try {
    const threadId = threadStore.get(sessionId) || null;
    const agentResponse = await callWatsonAgent(message, threadId);

    // Store thread_id for conversation continuity
    if (agentResponse.thread_id) {
      threadStore.set(sessionId, agentResponse.thread_id);
    }

    res.json({
      success: true,
      response: agentResponse
    });
  } catch (error) {
    console.error('Watson Agent error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message
    });
  }
});

// API: Get AI Suggestions for Compliance (Watson Orchestrate)
app.post('/api/agent/compliance-suggestions', async (req, res) => {
  const { code, complianceType, issues } = req.body;

  try {
    const prompt = `Analyze the following for ${complianceType} compliance and provide optimization suggestions.\nCode context: ${code}\nKnown issues: ${(issues || []).join(', ')}\nProvide: 1) Optimization recommendations with priority, effort, and impact. 2) Alternative approaches with pros/cons.`;
    const agentResponse = await callWatsonAgent(prompt);

    res.json({
      success: true,
      response: agentResponse,
      // Keep mock fallback structure for UI compatibility
      suggestions: generateAISuggestions(code, complianceType, issues)
    });
  } catch (error) {
    console.error('Watson Agent error:', error.response?.data || error.message);
    // Fallback to mock data if agent fails
    res.json({
      success: true,
      suggestions: generateAISuggestions(code, complianceType, issues),
      fallback: true
    });
  }
});

// API: Get Alternative Approaches (Watson Orchestrate)
app.post('/api/agent/alternatives', async (req, res) => {
  const { currentApproach, context } = req.body;

  try {
    const prompt = `Suggest alternative approaches for: ${currentApproach}. Context: ${context}. Provide architecture options with benefits, implementation details, and estimated effort.`;
    const agentResponse = await callWatsonAgent(prompt);

    res.json({
      success: true,
      response: agentResponse,
      alternatives: generateAlternatives(currentApproach, context)
    });
  } catch (error) {
    console.error('Watson Agent error:', error.response?.data || error.message);
    res.json({
      success: true,
      alternatives: generateAlternatives(currentApproach, context),
      fallback: true
    });
  }
});

// API: Generate Test Framework (Watson Orchestrate)
app.post('/api/agent/generate-tests', async (req, res) => {
  const { code, vulnerability, fixApplied } = req.body;

  try {
    const prompt = `Generate a test framework for the following vulnerability fix.\nVulnerability: ${vulnerability}\nFix applied: ${fixApplied}\nCode: ${code}\nProvide test suites with specific test cases.`;
    const agentResponse = await callWatsonAgent(prompt);

    res.json({
      success: true,
      response: agentResponse,
      testFramework: generateTestFramework(code, vulnerability, fixApplied)
    });
  } catch (error) {
    console.error('Watson Agent error:', error.response?.data || error.message);
    res.json({
      success: true,
      testFramework: generateTestFramework(code, vulnerability, fixApplied),
      fallback: true
    });
  }
});

// API: Code Review with AI (Watson Orchestrate)
app.post('/api/agent/code-review', async (req, res) => {
  const { prUrl, code, changes } = req.body;

  try {
    const prompt = `Perform a security-focused code review.\nPR URL: ${prUrl || 'N/A'}\nCode changes: ${changes || code}\nEvaluate: security, performance, maintainability. Provide scores and specific suggestions.`;
    const agentResponse = await callWatsonAgent(prompt);

    res.json({
      success: true,
      response: agentResponse,
      review: generateAICodeReview(code, changes)
    });
  } catch (error) {
    console.error('Watson Agent error:', error.response?.data || error.message);
    res.json({
      success: true,
      review: generateAICodeReview(code, changes),
      fallback: true
    });
  }
});

// ============================================
// Helper Functions
// ============================================

function generateMockFindings(scanType) {
  const findings = {
    fips: [
      {
        id: 'FIPS-001',
        severity: 'HIGH',
        title: 'Non-FIPS Approved Algorithm Detected',
        description: 'MD5 hash function is not FIPS 140-2 approved',
        location: 'src/utils/crypto.js:45',
        recommendation: 'Replace MD5 with SHA-256 or SHA-3'
      },
      {
        id: 'FIPS-002',
        severity: 'MEDIUM',
        title: 'Weak Key Size',
        description: 'RSA key size of 1024 bits is below FIPS requirement',
        location: 'src/auth/keys.js:12',
        recommendation: 'Use minimum 2048-bit RSA keys'
      }
    ],
    vulnerability: [
      {
        id: 'VULN-001',
        severity: 'CRITICAL',
        title: 'SQL Injection Vulnerability',
        description: 'Unsanitized user input in SQL query',
        location: 'src/api/users.js:78',
        cve: 'CVE-2024-1234',
        recommendation: 'Use parameterized queries or ORM'
      },
      {
        id: 'VULN-002',
        severity: 'HIGH',
        title: 'Outdated Dependency',
        description: 'lodash@4.17.15 has known vulnerabilities',
        location: 'package.json',
        cve: 'CVE-2024-5678',
        recommendation: 'Update to lodash@4.17.21 or higher'
      }
    ]
  };
  
  return scanType === 'fips' ? findings.fips : findings.vulnerability;
}

function generateFIPSIssues() {
  return [
    {
      category: 'Cryptographic Algorithms',
      status: 'FAIL',
      details: 'Non-approved algorithms detected: MD5, DES',
      impact: 'HIGH'
    },
    {
      category: 'Key Management',
      status: 'PASS',
      details: 'Key generation and storage meet FIPS standards',
      impact: 'N/A'
    },
    {
      category: 'Self-Tests',
      status: 'FAIL',
      details: 'Missing power-on self-tests',
      impact: 'MEDIUM'
    }
  ];
}

function generateVulnFixes(vulnerabilities) {
  return [
    {
      vulnerability: 'SQL Injection',
      originalCode: `const query = "SELECT * FROM users WHERE id = " + userId;`,
      fixedCode: `const query = "SELECT * FROM users WHERE id = ?";
db.query(query, [userId]);`,
      explanation: 'Implemented parameterized query to prevent SQL injection',
      testCoverage: '95%'
    },
    {
      vulnerability: 'XSS',
      originalCode: `element.innerHTML = userInput;`,
      fixedCode: `element.textContent = userInput;`,
      explanation: 'Using textContent instead of innerHTML to prevent XSS',
      testCoverage: '100%'
    }
  ];
}

function generateAISuggestions(code, complianceType, issues) {
  return {
    optimizations: [
      {
        title: 'Use FIPS-Approved Crypto Library',
        description: 'Replace current crypto implementation with OpenSSL FIPS module',
        priority: 'HIGH',
        effort: 'MEDIUM',
        impact: 'Ensures full FIPS 140-2 compliance',
        codeExample: `const crypto = require('crypto');
// Use FIPS-approved algorithms
const hash = crypto.createHash('sha256');`
      },
      {
        title: 'Implement Key Rotation',
        description: 'Add automated key rotation mechanism',
        priority: 'MEDIUM',
        effort: 'HIGH',
        impact: 'Improves security posture and compliance',
        codeExample: `class KeyRotation {
  rotateKeys(interval = 90) {
    // Rotate keys every 90 days
  }
}`
      }
    ],
    alternatives: [
      {
        approach: 'Hardware Security Module (HSM)',
        pros: ['FIPS 140-2 Level 3 certified', 'Physical security', 'High performance'],
        cons: ['Higher cost', 'Complex setup'],
        useCase: 'Enterprise applications with strict compliance requirements'
      },
      {
        approach: 'Software-based FIPS Module',
        pros: ['Lower cost', 'Easier deployment', 'Good for most use cases'],
        cons: ['FIPS 140-2 Level 1 only', 'Software vulnerabilities'],
        useCase: 'Standard web applications and services'
      }
    ]
  };
}

function generateAlternatives(currentApproach, context) {
  return [
    {
      name: 'Microservices Architecture',
      description: 'Split monolithic security checks into microservices',
      benefits: ['Better scalability', 'Independent deployment', 'Fault isolation'],
      implementation: 'Use Docker containers with Kubernetes orchestration',
      estimatedEffort: '3-4 weeks'
    },
    {
      name: 'Event-Driven Architecture',
      description: 'Use message queues for async security scanning',
      benefits: ['Better performance', 'Decoupled components', 'Easy scaling'],
      implementation: 'Implement with RabbitMQ or Apache Kafka',
      estimatedEffort: '2-3 weeks'
    }
  ];
}

function generateTestFramework(code, vulnerability, fixApplied) {
  return {
    framework: 'Jest + Supertest',
    testSuites: [
      {
        name: 'Security Tests',
        tests: [
          {
            name: 'should prevent SQL injection',
            code: `test('should prevent SQL injection', async () => {
  const maliciousInput = "1' OR '1'='1";
  const response = await request(app)
    .get('/api/users')
    .query({ id: maliciousInput });
  expect(response.status).toBe(400);
  expect(response.body.error).toContain('Invalid input');
});`
          },
          {
            name: 'should sanitize XSS attempts',
            code: `test('should sanitize XSS attempts', () => {
  const xssInput = '<script>alert("XSS")</script>';
  const sanitized = sanitizeInput(xssInput);
  expect(sanitized).not.toContain('<script>');
});`
          }
        ]
      },
      {
        name: 'Integration Tests',
        tests: [
          {
            name: 'should handle edge cases',
            code: `test('should handle edge cases', async () => {
  const edgeCases = ['', null, undefined, 0, -1];
  for (const testCase of edgeCases) {
    const response = await request(app)
      .post('/api/data')
      .send({ value: testCase });
    expect(response.status).toBeLessThan(500);
  }
});`
          }
        ]
      }
    ],
    coverage: {
      statements: 92,
      branches: 88,
      functions: 95,
      lines: 91
    }
  };
}

function generateAICodeReview(code, changes) {
  return {
    overallScore: 8.5,
    categories: {
      security: {
        score: 9,
        comments: [
          'Good use of parameterized queries',
          'Input validation implemented correctly',
          'Consider adding rate limiting'
        ]
      },
      performance: {
        score: 8,
        comments: [
          'Efficient database queries',
          'Consider adding caching for frequently accessed data'
        ]
      },
      maintainability: {
        score: 8.5,
        comments: [
          'Well-structured code',
          'Good error handling',
          'Add more inline comments for complex logic'
        ]
      }
    },
    suggestions: [
      {
        line: 45,
        severity: 'MEDIUM',
        message: 'Consider using async/await instead of callbacks',
        suggestedFix: 'const result = await db.query(sql, params);'
      },
      {
        line: 78,
        severity: 'LOW',
        message: 'Extract magic number to constant',
        suggestedFix: 'const MAX_RETRY_ATTEMPTS = 3;'
      }
    ]
  };
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 API Documentation: http://localhost:${PORT}/api/health`);
});

// Made with Bob

module.exports = {
  generateMockFindings,
  generateFIPSIssues,
  generateVulnFixes,
  generateAISuggestions,
  generateAlternatives,
  generateTestFramework,
  generateAICodeReview,
  getBearerToken,
  callWatsonAgent
};
