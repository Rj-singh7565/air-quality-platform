# AirWatch - AI-Driven Hyperlocal Air Quality Monitoring Platform

A Progressive Web App that combines air quality monitoring, citizen pollution reporting, AI verification, pollution hotspot detection, prediction, and citizen participation incentives.

## 🌟 Features

- **Real-time AQI Dashboard** - Live air quality data for Indian cities with map visualization
- **AI-Powered Pollution Reporting** - Upload images and get instant AI classification
- **Pollution Hotspot Detection** - Identify areas with concentrated pollution reports
- **AQI Predictions** - 7-day air quality forecasts with interactive charts
- **Gamification** - Earn points, badges, and climb the leaderboard
- **PWA Support** - Works offline and installable on mobile devices

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Backend | Express.js |
| Database | PostgreSQL + PostGIS |
| Maps | Leaflet.js |
| AI | TensorFlow.js |
| Charts | Chart.js |
| Auth | JWT + bcrypt |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ with PostGIS extension
- npm or yarn

### Setup

1. **Clone and install dependencies:**
```bash
cd air-quality-platform
npm run install:all
```

2. **Configure environment:**
```bash
# Edit .env with your database credentials
cp .env.example .env
```

3. **Create PostgreSQL database:**
```sql
CREATE DATABASE airquality_db;
\c airquality_db
CREATE EXTENSION postgis;
CREATE EXTENSION "uuid-ossp";
```

4. **Initialize database tables:**
```bash
npm run db:init
```

5. **Start development:**
```bash
npm run dev
```

This starts both the backend (port 5000) and frontend (port 5173).

### Individual Commands

```bash
npm run server:dev    # Start backend only
npm run client        # Start frontend only
npm run client:build  # Build frontend for production
```

## 📁 Project Structure

```
air-quality-platform/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── context/       # Auth context
│   │   ├── pages/         # Page components
│   │   ├── services/      # API & AI services
│   │   └── App.jsx        # Main app with routing
│   └── vite.config.js     # Vite + PWA config
├── server/                 # Express Backend
│   ├── config/            # DB connection & init
│   ├── controllers/       # Route handlers
│   ├── middleware/         # Auth middleware
│   ├── routes/            # API routes
│   └── server.js          # Entry point
└── package.json           # Root scripts
```

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/login` | User login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/aqi/cities` | AQI data for all cities |
| GET | `/api/aqi/city/:name` | AQI for specific city |
| GET | `/api/aqi/predict` | 7-day AQI prediction |
| GET | `/api/reports` | List pollution reports |
| POST | `/api/reports` | Create report (with image) |
| GET | `/api/reports/hotspots` | Pollution hotspots |
| GET | `/api/reports/nearby` | Nearby reports |
| POST | `/api/reports/:id/vote` | Upvote/downvote report |
| GET | `/api/users/leaderboard` | User leaderboard |
| GET | `/api/users/stats` | Platform statistics |

## 📱 PWA Features

- ✅ Installable on mobile and desktop
- ✅ Offline-capable with service worker
- ✅ Responsive design for all screen sizes
- ✅ App-like navigation with sidebar

## 🎮 Gamification System

| Action | Points |
|--------|--------|
| Submit Report | +10 |
| AI Verified Report | +5 bonus |
| Community Upvote | +2 |

### Badges
- 🌱 **Contributor** - 50+ points
- 🔥 **Warrior** - 100+ points
- 💎 **Champion** - 200+ points
- 🌟 **Guardian** - 500+ points
