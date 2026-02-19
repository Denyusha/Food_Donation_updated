# 🚀 Food Donation Platform - Setup & Run Guide

## ✅ Prerequisites Installed
- Node.js (Already installed)
- npm (Already installed)
- All dependencies (Already installed)

## 🎯 Quick Start (No MongoDB Required!)

Since MongoDB is not installed on your system, I've created a **development server with in-memory database** that works perfectly without MongoDB.

### Step 1: Start Backend Server

Open a terminal in the project root and run:

```bash
cd backend
npm run start:dev
```

This starts the backend with:
- ✅ In-memory database (no MongoDB needed)
- ✅ Sample data pre-loaded
- ✅ Test user accounts ready

**Backend is running at:** http://localhost:5000

### Step 2: Start Frontend Application

Open another terminal in the project root and run:

```bash
cd frontend
npm start
```

**Frontend will open at:** http://localhost:3000

## 📝 Test Credentials

Use these pre-configured accounts to test the application:

| Role | Email | Password |
|------|-------|----------|
| **Donor** | donor@test.com | password123 |
| **Receiver** | receiver@test.com | password123 |
| **Volunteer** | volunteer@test.com | password123 |

## 🗺️ Mapbox Configuration (Optional)

To enable 3D maps, get a free Mapbox token:

1. Sign up at [Mapbox](https://www.mapbox.com/)
2. Copy your access token
3. Update `frontend/.env`:
```env
REACT_APP_MAPBOX_TOKEN=your_actual_mapbox_token
```

Without a Mapbox token, the app will still work but maps may show a watermark.

## 🌟 Features to Test

### 1. **3D Maps**
- Open the homepage
- See the 3D map with buildings and terrain
- Toggle between 2D/3D view
- Works offline after initial load

### 2. **GPS Tracking**
- Allow location permission when prompted
- Your location appears on the map
- Real-time tracking for volunteers

### 3. **Offline Mode**
- Load the app once while online
- Turn off internet/go to airplane mode
- App continues working with cached data
- Actions sync when back online

### 4. **Test Workflow**

#### As a Donor:
1. Login with `donor@test.com`
2. Click "Donate Food"
3. Fill the form and submit
4. See your donation on the map

#### As a Receiver:
1. Login with `receiver@test.com`
2. Browse available donations
3. Accept a donation
4. Track delivery status

#### As a Volunteer:
1. Login with `volunteer@test.com`
2. View available pickups
3. Assign yourself to a delivery
4. Share live location during delivery

## 💡 Development Mode Features

The development server includes:
- **Pre-loaded sample donations** in Bangalore area
- **Instant responses** (no database lag)
- **Auto-refresh** on code changes
- **CORS enabled** for frontend connection
- **Socket.io** for real-time notifications

## 🔧 Troubleshooting

### Backend Issues:
```bash
# If port 5000 is in use:
netstat -ano | findstr :5000
taskkill /PID <process_id> /F

# Then restart:
cd backend
npm run start:dev
```

### Frontend Issues:
```bash
# If port 3000 is in use:
netstat -ano | findstr :3000
taskkill /PID <process_id> /F

# Clear cache and restart:
cd frontend
rm -rf node_modules/.cache
npm start
```

### Map Not Loading:
- Check if you have a valid Mapbox token in `.env`
- Ensure location permissions are allowed
- Try refreshing the page

## 📦 What's Running

Currently you have:

1. **Backend Server** (Port 5000)
   - REST API endpoints
   - Socket.io for real-time updates
   - In-memory database
   - Sample data loaded

2. **Frontend App** (Port 3000)
   - React application
   - 3D Mapbox integration
   - PWA with offline support
   - Service worker enabled

## 🚀 Production Deployment

For production, you'll need:

1. **MongoDB Atlas** (Free tier available)
   - Sign up at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Update `backend/.env` with connection string

2. **Update backend startup**:
   ```bash
   cd backend
   npm start  # Uses real MongoDB
   ```

3. **Build for production**:
   ```bash
   cd frontend
   npm run build
   ```

## 📱 Install as App (PWA)

1. Open http://localhost:3000 in Chrome/Edge
2. Look for install icon in address bar
3. Click "Install Food Donation"
4. App works offline!

## 🎨 Key Enhancements Implemented

- ✅ **3D Maps** with offline support
- ✅ **GPS tracking** for all users
- ✅ **Elegant UI** with animations
- ✅ **PWA** with service worker
- ✅ **Offline functionality**
- ✅ **Real-time updates**
- ✅ **In-memory database** for easy testing

## 📸 Screenshots

The application features:
- 3D map visualization on homepage
- Live delivery tracking
- Elegant cards with gradients
- Smooth animations
- Dark mode support

---

**Enjoy testing the enhanced Food Donation Platform!** 🎉

For any issues, check the console logs in both terminal windows.