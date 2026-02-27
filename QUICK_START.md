# 🚀 Quick Start - Run the Application in 3 Steps

## Method 1: Automatic Start (Recommended)

### Step 1: Make sure you're in the project directory
```bash
cd /Users/khushi/Documents/Eureka-hack
```

### Step 2: Run the startup script
```bash
./start.sh
```

That's it! The application will start automatically.

---

## Method 2: Manual Start (Step by Step)

### Terminal 1 - Start Backend

```bash
# Navigate to backend directory
cd /Users/khushi/Documents/Eureka-hack/backend

# Start the server
npm run dev
```

**Expected Output:**
```
🚀 Server running on port 5000
📊 API Documentation: http://localhost:5000/api/health
```

### Terminal 2 - Start Frontend

Open a **NEW terminal** and run:

```bash
# Navigate to frontend directory
cd /Users/khushi/Documents/Eureka-hack/frontend

# Start React app
npm start
```

**Expected Output:**
```
Compiled successfully!

You can now view frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

The browser will automatically open to http://localhost:3000

---

## ✅ Verify Everything is Working

### 1. Check Backend
Open your browser and go to:
```
http://localhost:5000/api/health
```

You should see:
```json
{
  "status": "healthy",
  "timestamp": "2026-02-23T18:15:00.000Z",
  "version": "1.0.0"
}
```

### 2. Check Frontend
The browser should automatically open to:
```
http://localhost:3000
```

You should see:
- Purple gradient header
- "Security Compliance & Vulnerability Assessment Platform" title
- Two tabs: "Level 1: Standard" and "Level 2: AI Agent"
- Repository scanner section

---

## 🎮 Try the Demo

### Test 1: Run a Security Scan

1. In the **Repository Scanner** section:
   - Enter: `https://github.com/example/repo`
   - Select: **FIPS Compliance**
   - Click: **Start Scan**

2. Watch the results appear below in the **Scan Results** section

### Test 2: Run FIPS Compliance Workflow

1. Click the **FIPS Compliance Check** button
2. Watch the workflow steps progress:
   - ✅ Initialize Scan (completed)
   - 🔄 Check Cryptographic Modules (running)
   - ⏳ Validate Algorithms (pending)
   - etc.
3. After 2-3 seconds, see the compliance score (e.g., 85/100)

### Test 3: Run Vulnerability Fix Workflow

1. Click the **Vulnerability Fix & PR** button
2. Watch as the system:
   - Analyzes vulnerabilities
   - Generates fixes
   - Creates a pull request
   - Runs tests
3. See the generated fixes with before/after code

### Test 4: Try AI Agent Features

1. Click the **Level 2: AI Agent** tab
2. Click **Get AI Suggestions**
3. View:
   - Optimization recommendations
   - Alternative approaches with pros/cons
   - Code examples
   - Implementation guidance

---

## 📸 What You Should See

### Level 1 Dashboard
```
┌─────────────────────────────────────────────────────┐
│  🛡️ Security Compliance & Vulnerability Assessment  │
│  [Level 1: Standard] [Level 2: AI Agent]           │
└─────────────────────────────────────────────────────┘

Repository Scanner
┌─────────────────────────────────────────────────────┐
│ Repository URL: [https://github.com/example/repo]  │
│ Scan Type: [FIPS Compliance ▼]  [▶ Start Scan]    │
└─────────────────────────────────────────────────────┘

Workflows
┌─────────────────────────────────────────────────────┐
│ [🛡️ FIPS Compliance Check]                         │
│ [⚠️ Vulnerability Fix & PR]                         │
└─────────────────────────────────────────────────────┘

Scan Results
┌─────────────────────────────────────────────────────┐
│ FIPS                                    [completed] │
│ https://github.com/example/repo                     │
│ Feb 23, 2026, 11:45 PM                             │
│ ⚠️ 2 findings                                       │
│                                                     │
│ [HIGH] Non-FIPS Approved Algorithm Detected        │
│ [MEDIUM] Weak Key Size                             │
└─────────────────────────────────────────────────────┘
```

### Level 2 AI Agent
```
┌─────────────────────────────────────────────────────┐
│  🧠 AI-Powered Compliance Assistant                 │
│  [⚡ Get AI Suggestions]                            │
└─────────────────────────────────────────────────────┘

Optimizations
┌─────────────────────────────────────────────────────┐
│ Use FIPS-Approved Crypto Library          [HIGH]   │
│ Replace current crypto with OpenSSL FIPS module    │
│ Effort: MEDIUM | Impact: Full FIPS compliance      │
│                                                     │
│ const crypto = require('crypto');                   │
│ const hash = crypto.createHash('sha256');          │
└─────────────────────────────────────────────────────┘

Alternative Approaches
┌─────────────────────────────────────────────────────┐
│ Hardware Security Module (HSM)                      │
│ Pros: ✅ FIPS Level 3, ✅ Physical security        │
│ Cons: ❌ Higher cost, ❌ Complex setup             │
│ Use Case: Enterprise applications                   │
└─────────────────────────────────────────────────────┘
```

---

## 🛠️ Troubleshooting

### Problem: "npm: command not found"
**Solution:** Install Node.js first
```bash
# Check if Node.js is installed
node --version

# If not installed, download from: https://nodejs.org/
```

### Problem: "Cannot find module 'express'"
**Solution:** Install dependencies
```bash
cd backend
npm install
```

### Problem: "Port 5000 already in use"
**Solution:** Kill the process or change port
```bash
# Kill process on port 5000
lsof -ti:5000 | xargs kill -9

# Or change port in backend/.env
echo "PORT=5001" > backend/.env
```

### Problem: Frontend won't connect to backend
**Solution:** Check both are running
```bash
# Check backend
curl http://localhost:5000/api/health

# Check frontend
curl http://localhost:3000
```

### Problem: "React app won't start"
**Solution:** Clear cache and reinstall
```bash
cd frontend
rm -rf node_modules
npm install
npm start
```

---

## 📱 Access URLs

Once running, access these URLs:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Main application UI |
| **Backend API** | http://localhost:5000 | REST API server |
| **Health Check** | http://localhost:5000/api/health | API status |

---

## 🎯 Next Steps

1. ✅ **Explore the UI** - Try all features
2. 📖 **Read Documentation** - Check `docs/THEORY_DOCUMENTATION.md`
3. 🎤 **Review Presentation** - See `docs/PRESENTATION.md`
4. 🎮 **Follow Demo Guide** - Use `docs/DEMO_GUIDE.md`
5. 🔧 **Customize** - Modify code to fit your needs

---

## 📞 Need Help?

- **Documentation**: See `README.md` for full details
- **Theory**: Read `docs/THEORY_DOCUMENTATION.md`
- **Demo**: Follow `docs/DEMO_GUIDE.md`
- **Issues**: Check troubleshooting section above

---

## 🎉 You're All Set!

The application is now running and ready to use. Enjoy exploring the Security Compliance & Vulnerability Assessment Platform!

**Happy Testing!** 🚀