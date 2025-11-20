# Deployment Guide

## Railway Deployment (Recommended)

Railway is the easiest option for this Node.js application.

### Steps:

1. **Push your code to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy on Railway**:
   - Go to [railway.app](https://railway.app)
   - Sign up/login with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect Node.js

3. **Configure Environment Variables** (if needed):
   - In Railway dashboard, go to Variables tab
   - Add any required env vars:
     - `PORT` (Railway sets this automatically)
     - `NODE_ENV=production`
     - `CORS_ORIGIN` (your domain)

4. **Deploy**:
   - Railway will automatically build and deploy
   - Your app will be live at `https://your-app.railway.app`

### Railway Configuration

Railway will automatically:
- Detect `package.json`
- Run `npm install`
- Start with `npm start` (uses the start script)

---

## Render Deployment

1. Go to [render.com](https://render.com)
2. Sign up/login
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Settings:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
6. Deploy!

---

## Alternative: Split Deployment (Netlify + Backend)

If you want to use Netlify for the frontend:

1. **Deploy backend** to Railway/Render
2. **Deploy frontend** to Netlify:
   - Build command: (none needed - static files)
   - Publish directory: `public`
   - Update frontend API URLs to point to your backend

**Note**: Socket.IO won't work with this setup unless you use a different real-time solution.

---

## Environment Variables

Create a `.env` file or set in your hosting platform:

```env
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://your-domain.com
CONFIG_PATH=./config/services.json
```

---

## Post-Deployment Checklist

- [ ] Verify API endpoints work: `https://your-app.com/api/status`
- [ ] Check Socket.IO connection in browser console
- [ ] Test health check polling
- [ ] Verify CORS settings if frontend is on different domain
- [ ] Test configuration reload endpoint

