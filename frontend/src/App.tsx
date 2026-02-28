import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Activity,
  Code,
  GitPullRequest,
  Zap,
  Brain,
  FileText,
  Settings,
  Play,
  RefreshCw
} from 'lucide-react';
import './App.css';
import MarkdownMessage from './components/MarkdownMessage';

const API_BASE_URL = 'http://localhost:5001/api';

interface ScanResult {
  id: string;
  repoUrl: string;
  scanType: string;
  timestamp: string;
  status: string;
  findings: any[];
}

interface Workflow {
  id: string;
  type: string;
  status: string;
  steps: any[];
  complianceScore?: number;
  prUrl?: string;
  agentResponse?: string;
  error?: string;
}

function App() {
  const [activeTab, setActiveTab] = useState<'level1' | 'level2'>('level1');
  const [repoUrl, setRepoUrl] = useState('https://github.com/example/repo');
  const [scanType, setScanType] = useState<'fips' | 'vulnerability'>('fips');
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');

  // Fetch all scans on mount
  useEffect(() => {
    fetchAllScans();
  }, []);

  const fetchAllScans = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/scan/all`);
      if (response.data.success) {
        setScanResults(response.data.scans);
      }
    } catch (error) {
      console.error('Error fetching scans:', error);
    }
  };

  const handleScan = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/scan/repository`, {
        repoUrl,
        scanType
      });
      
      if (response.data.success) {
        setScanResults([response.data.result, ...scanResults]);
      }
    } catch (error) {
      console.error('Error scanning repository:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFIPSWorkflow = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/workflow/fips-compliance`, {
        repoUrl,
        branch: 'main'
      });
      
      if (response.data.success) {
        setWorkflows([response.data.workflow, ...workflows]);
        setSelectedWorkflow(response.data.workflow);
        
        // Poll for updates
        const workflowId = response.data.workflowId;
        const pollInterval = setInterval(async () => {
          const statusResponse = await axios.get(`${API_BASE_URL}/workflow/${workflowId}`);
          if (statusResponse.data.success) {
            const updatedWorkflow = statusResponse.data.workflow;
            setSelectedWorkflow(updatedWorkflow);
            setWorkflows(prev => prev.map(w => w.id === workflowId ? updatedWorkflow : w));
            
            if (updatedWorkflow.status === 'completed') {
              clearInterval(pollInterval);
            }
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Error starting FIPS workflow:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVulnFixWorkflow = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/workflow/vuln-fix`, {
        repoUrl,
        vulnerabilities: ['SQL Injection', 'XSS'],
        autoFix: true
      });
      
      if (response.data.success) {
        setWorkflows([response.data.workflow, ...workflows]);
        setSelectedWorkflow(response.data.workflow);
        
        // Poll for updates
        const workflowId = response.data.workflowId;
        const pollInterval = setInterval(async () => {
          const statusResponse = await axios.get(`${API_BASE_URL}/workflow/${workflowId}`);
          if (statusResponse.data.success) {
            const updatedWorkflow = statusResponse.data.workflow;
            setSelectedWorkflow(updatedWorkflow);
            setWorkflows(prev => prev.map(w => w.id === workflowId ? updatedWorkflow : w));
            
            if (updatedWorkflow.status === 'completed') {
              clearInterval(pollInterval);
            }
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Error starting vulnerability fix workflow:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChatSend = async () => {
    if (!chatInput.trim()) return;

    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setChatInput('');
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/agent/chat`, {
        message: userMessage,
        sessionId: 'ui-session'
      });

      if (response.data.success) {
        // Extract the agent's reply from the response
        const agentData = response.data.response;
        let agentMessage = '';

        if (agentData.message?.content) {
          agentMessage = agentData.message.content;
        } else if (agentData.choices?.[0]?.message?.content) {
          agentMessage = agentData.choices[0].message.content;
        } else if (typeof agentData === 'string') {
          agentMessage = agentData;
        } else {
          agentMessage = JSON.stringify(agentData, null, 2);
        }

        setChatMessages(prev => [...prev, { role: 'assistant', content: agentMessage }]);
      }
    } catch (error: any) {
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.response?.data?.error || error.message}`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleGetAISuggestions = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/agent/compliance-suggestions`, {
        code: 'sample code',
        complianceType: 'FIPS',
        issues: ['Non-approved algorithm']
      });
      
      if (response.data.success) {
        setAiSuggestions(response.data.suggestions);
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <div className="logo">
            <Shield size={32} />
            <h1>Security Compliance & Vulnerability Assessment Platform</h1>
          </div>
          <div className="header-tabs">
            <button
              className={`tab-button ${activeTab === 'level1' ? 'active' : ''}`}
              onClick={() => setActiveTab('level1')}
            >
              <Settings size={20} />
              Level 1: Standard
            </button>
            <button
              className={`tab-button ${activeTab === 'level2' ? 'active' : ''}`}
              onClick={() => setActiveTab('level2')}
            >
              <Brain size={20} />
              Level 2: AI Agent
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {activeTab === 'level1' && (
          <div className="level1-content">
            <div className="section">
              <h2><Code size={24} /> Repository Scanner</h2>
              <div className="input-group">
                <input
                  type="text"
                  placeholder="Repository URL"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="input-field"
                />
                <select
                  value={scanType}
                  onChange={(e) => setScanType(e.target.value as 'fips' | 'vulnerability')}
                  className="select-field"
                >
                  <option value="fips">FIPS Compliance</option>
                  <option value="vulnerability">Vulnerability Scan</option>
                </select>
                <button onClick={handleScan} disabled={loading} className="btn btn-primary">
                  <Play size={20} />
                  {loading ? 'Scanning...' : 'Start Scan'}
                </button>
              </div>
            </div>

            <div className="section">
              <h2><Activity size={24} /> Workflows</h2>
              <div className="workflow-buttons">
                <button onClick={handleFIPSWorkflow} disabled={loading} className="btn btn-workflow">
                  <Shield size={20} />
                  FIPS Compliance Check
                </button>
                <button onClick={handleVulnFixWorkflow} disabled={loading} className="btn btn-workflow">
                  <AlertTriangle size={20} />
                  Vulnerability Fix & PR
                </button>
              </div>
            </div>

            {selectedWorkflow && (
              <div className="section workflow-details">
                <h2><GitPullRequest size={24} /> Workflow: {selectedWorkflow.type}</h2>
                <div className="workflow-status">
                  <span className={`status-badge ${selectedWorkflow.status}`}>
                    {selectedWorkflow.status.toUpperCase()}
                  </span>
                  {selectedWorkflow.complianceScore && (
                    <span className="compliance-score">
                      Score: {selectedWorkflow.complianceScore}/100
                    </span>
                  )}
                </div>
                <div className="workflow-steps">
                  {selectedWorkflow.steps.map((step, index) => (
                    <div key={index} className={`step ${step.status}`}>
                      {step.status === 'completed' && <CheckCircle size={20} />}
                      {step.status === 'running' && <RefreshCw size={20} className="spinning" />}
                      {step.status === 'pending' && <div className="step-dot" />}
                      <span>{step.name}</span>
                    </div>
                  ))}
                </div>
                {selectedWorkflow.prUrl && (
                  <div className="pr-link">
                    <GitPullRequest size={20} />
                    <a href={selectedWorkflow.prUrl} target="_blank" rel="noopener noreferrer">
                      View Pull Request
                    </a>
                  </div>
                )}
                {selectedWorkflow.error && (
                  <div className="pr-link" style={{ color: '#e74c3c' }}>
                    <AlertTriangle size={20} />
                    <span>Error: {selectedWorkflow.error}</span>
                  </div>
                )}
                {selectedWorkflow.agentResponse && (
                  <div className="agent-response">
                    <h3>Agent Response</h3>
                    <MarkdownMessage content={selectedWorkflow.agentResponse} />
                  </div>
                )}
              </div>
            )}

            <div className="section">
              <h2><FileText size={24} /> Scan Results</h2>
              <div className="results-grid">
                {scanResults.map((result) => (
                  <div key={result.id} className="result-card">
                    <div className="result-header">
                      <h3>{result.scanType.toUpperCase()}</h3>
                      <span className={`status-badge ${result.status}`}>{result.status}</span>
                    </div>
                    <p className="result-repo">{result.repoUrl}</p>
                    <p className="result-time">{new Date(result.timestamp).toLocaleString()}</p>
                    <div className="findings-count">
                      <AlertTriangle size={16} />
                      {result.findings.length} findings
                    </div>
                    <div className="findings-list">
                      {result.findings.slice(0, 3).map((finding, idx) => (
                        <div key={idx} className={`finding severity-${finding.severity.toLowerCase()}`}>
                          <span className="severity-badge">{finding.severity}</span>
                          <span className="finding-title">{finding.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'level2' && (
          <div className="level2-content">
            <div className="section">
              <h2><Brain size={24} /> AI-Powered Compliance Assistant</h2>
              <p className="section-description">
                Chat with the Watson Orchestrate agent for security compliance insights, or get quick AI suggestions.
              </p>

              <div className="chat-container">
                <div className="chat-messages">
                  {chatMessages.length === 0 && (
                    <div className="chat-empty">
                      <Brain size={48} />
                      <p>Ask the Watson Orchestrate agent anything about security compliance...</p>
                    </div>
                  )}
                  {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`chat-message ${msg.role}`}>
                      <div className="chat-bubble">
                        <span className="chat-role">{msg.role === 'user' ? 'You' : 'Agent'}</span>
                        {msg.role === 'assistant' ? (
                          <MarkdownMessage content={msg.content} />
                        ) : (
                          <p>{msg.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {loading && (
                    <div className="chat-message assistant">
                      <div className="chat-bubble">
                        <span className="chat-role">Agent</span>
                        <p className="typing-indicator">Thinking...</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="chat-input-area">
                  <input
                    type="text"
                    placeholder="Ask about FIPS compliance, vulnerabilities, security best practices..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !loading && handleChatSend()}
                    className="input-field chat-input"
                    disabled={loading}
                  />
                  <button onClick={handleChatSend} disabled={loading || !chatInput.trim()} className="btn btn-primary">
                    <Zap size={20} />
                    Send
                  </button>
                </div>
              </div>

              <button onClick={handleGetAISuggestions} disabled={loading} className="btn btn-primary" style={{ marginTop: '16px' }}>
                <Zap size={20} />
                Get AI Suggestions
              </button>
            </div>

            {aiSuggestions && (
              <>
                <div className="section">
                  <h2><Zap size={24} /> Optimizations</h2>
                  <div className="suggestions-grid">
                    {aiSuggestions.optimizations.map((opt: any, idx: number) => (
                      <div key={idx} className="suggestion-card">
                        <div className="suggestion-header">
                          <h3>{opt.title}</h3>
                          <span className={`priority-badge ${opt.priority.toLowerCase()}`}>
                            {opt.priority}
                          </span>
                        </div>
                        <p>{opt.description}</p>
                        <div className="suggestion-meta">
                          <span>Effort: {opt.effort}</span>
                          <span>Impact: {opt.impact}</span>
                        </div>
                        <div className="code-example">
                          <pre>{opt.codeExample}</pre>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="section">
                  <h2><Settings size={24} /> Alternative Approaches</h2>
                  <div className="alternatives-grid">
                    {aiSuggestions.alternatives.map((alt: any, idx: number) => (
                      <div key={idx} className="alternative-card">
                        <h3>{alt.approach}</h3>
                        <div className="pros-cons">
                          <div className="pros">
                            <h4>Pros</h4>
                            <ul>
                              {alt.pros.map((pro: string, i: number) => (
                                <li key={i}><CheckCircle size={16} /> {pro}</li>
                              ))}
                            </ul>
                          </div>
                          <div className="cons">
                            <h4>Cons</h4>
                            <ul>
                              {alt.cons.map((con: string, i: number) => (
                                <li key={i}><AlertTriangle size={16} /> {con}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <p className="use-case"><strong>Use Case:</strong> {alt.useCase}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div className="section">
              <h2><FileText size={24} /> Features</h2>
              <div className="features-grid">
                <div className="feature-card">
                  <Brain size={32} />
                  <h3>Intelligent Suggestions</h3>
                  <p>AI-powered recommendations for compliance optimization</p>
                </div>
                <div className="feature-card">
                  <Code size={32} />
                  <h3>Code Review</h3>
                  <p>Automated code review with security best practices</p>
                </div>
                <div className="feature-card">
                  <Activity size={32} />
                  <h3>Test Generation</h3>
                  <p>Automatic test framework generation for vulnerabilities</p>
                </div>
                <div className="feature-card">
                  <GitPullRequest size={32} />
                  <h3>PR Analysis</h3>
                  <p>Deep analysis of pull requests with AI insights</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Security Compliance Platform v1.0.0 | Powered by AI & Advanced Security Tools</p>
      </footer>
    </div>
  );
}

export default App;

// Made with Bob
