# Note-Taking Application — Frontend

A clean, vanilla HTML5, CSS3, and JavaScript frontend client connecting to the Note-Taking REST API. Built without bloated frameworks or templates for pure performance and straightforward deployment.

---

## 📁 File Structure
```
frontend/
├── index.html          # Redirects to login
├── login.html          # Login view
├── register.html       # User registration with interests
├── dashboard.html      # User notes CRUD & own posts
├── admin.html          # 4-tab Admin panel (Users, All Notes, Interests Aggregation, $lookup)
├── posts.html          # Public posts feed
├── css/
│   └── style.css       # Clean, modern responsive design with glassmorphism & dark theme
└── js/
    ├── api.js          # Fetch wrapper, JWT storage, 401 token guard, cloud URL detection
    ├── auth.js         # Login & register event handling
    ├── dashboard.js    # Notes CRUD & personal post creation
    ├── admin.js        # Admin management, interactive filters, aggregation visualizers
    └── posts.js        # Public posts listing & smart navbar
```

---

## 🚀 Live Cloud Deployment (Netlify or Vercel)

### Option A: Deploy to Netlify
1. Connect your GitHub repository to Netlify.
2. Set the publish directory to `frontend`.
3. The included `netlify.toml` automatically handles SPA routing and security headers.

### Option B: Deploy to Vercel
1. Import the `frontend` folder into Vercel.
2. Deploy as a static site.

### Connecting to Live Backend:
In `js/api.js`, set `LIVE_BACKEND_URL`:
```javascript
const LIVE_BACKEND_URL = 'https://your-backend-app.onrender.com/api';
```
*(When running locally on `localhost` or `127.0.0.1`, it automatically defaults to `http://localhost:5000/api`).*

---

## 🔑 Test Credentials (from Seed)
- **Admin**: `admin@noteapp.com` / `admin123`
- **User**: `alice@example.com` / `password123`
- **User**: `bob@example.com` / `password123`
- **User**: `eva@example.com` / `password123`
