# How to Run the Security Compliance Platform

## Quick Start Guide

### Step 1: Start the Backend Server

Open a terminal and run:

```bash
cd backend
npm run dev
```

You should see:
```
🚀 Server running on port 5000
📊 API Documentation: http://localhost:5000/api/health
```

### Step 2: Start the Frontend (in a new terminal)

Open a **new terminal** and run:

```bash
cd frontend
npm start
```

The React app will automatically open in your browser at:
```
http://localhost:3000
```

### Step 3: Access the Application

Once both servers are running:
- **Frontend UI**: http://localhost:3000
- **Backend API**: http://localhost:5000

## Testing the Application

### 1. Test Backend API
Open your browser and visit:
```
http://localhost:5000/api/health
```

You should see:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-23T18:14:00.000Z",
  "version": "1.0.0"
}
```

### 2. Test Frontend
The frontend should automatically open at http://localhost:3000

You'll see:
- A purple gradient header with "Security Compliance & Vulnerability Assessment Platform"
- Two tabs: "Level 1: Standard" and "Level 2: AI Agent"
- Repository scanner input field
- Workflow buttons

### 3. Try a Demo Scan

1. In the "Repository Scanner" section:
   - Enter: `https://github.com/example/repo`
   - Select: "FIPS Compliance"
   - Click: "Start Scan"

2. Watch the results appear in the "Scan Results" section below

3. Try the workflows:
   - Click "FIPS Compliance Check" button
   - Watch the workflow progress in real-time
   - See the compliance score and findings

4. Switch to "Level 2: AI Agent" tab:
   - Click "Get AI Suggestions"
   - View AI-powered recommendations and alternatives

## Troubleshooting

### Backend won't start?
```bash
# Make sure you're in the backend directory
cd backend

# Check if dependencies are installed
npm install

# Try starting again
npm run dev
```

### Frontend won't start?
```bash
# Make sure you're in the frontend directory
cd frontend

# Check if dependencies are installed
npm install

# Try starting again
npm start
```

### Port already in use?
If port 5000 or 3000 is already in use:

**For Backend (port 5000):**
```bash
# Kill the process using port 5000
lsof -ti:5000 | xargs kill -9

# Or change the port in backend/.env
PORT=5001
```

**For Frontend (port 3000):**
The React app will automatically ask if you want to use a different port.

### Can't connect to backend?
Make sure:
1. Backend is running on port 5000
2. Frontend is configured to use http://localhost:5000
3. No firewall blocking the connection

## What You'll See

### Level 1: Standard Features
- **Repository Scanner**: Enter repo URL and scan for vulnerabilities
- **FIPS Compliance Workflow**: Automated compliance checking
- **Vulnerability Fix Workflow**: Auto-generate fixes and PRs
- **Scan Results**: View all findings with severity levels

### Level 2: AI Agent Features
- **AI Suggestions**: Get intelligent optimization recommendations
- **Alternative Approaches**: Compare different implementation strategies
- **Test Generation**: AI-generated security test suites
- **Code Review**: Automated code quality analysis

## Demo Data

The application uses mock data for demonstration. All scans and workflows will:
- Complete in 2-5 seconds
- Show realistic security findings
- Generate sample fixes and recommendations
- Display compliance scores and metrics

## Next Steps

1. **Explore the UI**: Click around and try different features
2. **Read the Documentation**: Check `docs/THEORY_DOCUMENTATION.md`
3. **Review the Code**: Look at `backend/server.js` and `frontend/src/App.tsx`
4. **Customize**: Modify the mock data or add real integrations

## Need Help?

- Check the README.md for detailed documentation
- Review docs/DEMO_GUIDE.md for feature explanations
- Look at docs/PRESENTATION.md for comprehensive overview

Enjoy exploring the Security Compliance Platform! 🚀