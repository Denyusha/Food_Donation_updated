# MongoDB Setup Guide

You have two options for setting up MongoDB:

## Option 1: MongoDB Atlas (Cloud - Recommended for Quick Setup)

1. **Create Free MongoDB Atlas Account:**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
   - Sign up for a free account
   - Create a new cluster (free tier available)

2. **Configure Database:**
   - Click "Connect" on your cluster
   - Add your IP address to whitelist (or allow all IPs for development)
   - Create a database user with password
   - Choose "Connect your application"
   - Copy the connection string

3. **Update .env file:**
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/food_donation?retryWrites=true&w=majority
   ```
   Replace `<username>` and `<password>` with your database user credentials.

## Option 2: Local MongoDB Installation

### Windows Installation:

1. **Download MongoDB:**
   - Visit [MongoDB Download Center](https://www.mongodb.com/try/download/community)
   - Download MongoDB Community Server for Windows
   - Run the installer (use default settings)

2. **Start MongoDB:**
   ```bash
   # MongoDB is usually installed as a Windows service and starts automatically
   # If not, run:
   "C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
   ```

3. **Update .env file:**
   ```env
   MONGODB_URI=mongodb://localhost:27017/food_donation
   ```

### Alternative: Use MongoDB in Docker

If you have Docker installed:

```bash
# Pull and run MongoDB container
docker run -d -p 27017:27017 --name mongodb-food-donation mongo:latest

# To stop:
docker stop mongodb-food-donation

# To start again:
docker start mongodb-food-donation
```

## Quick Test Setup (Using MongoDB Atlas)

For immediate testing, I've created a temporary test database configuration.
Update your `.env` file with:

```env
# Test MongoDB Atlas connection (limited usage)
MONGODB_URI=mongodb+srv://testuser:testpass123@cluster0.mongodb.net/food_donation_test?retryWrites=true&w=majority
```

**Note:** This is a shared test database. For production, create your own MongoDB Atlas account.

## Verify Connection

After setting up MongoDB, test the connection:

```bash
cd backend
npm run dev
```

You should see:
```
✅ MongoDB Connected: cluster0-shard-00-xx.mongodb.net
Server running on port 5000
```

## Troubleshooting

### Connection Errors:
- Check if MongoDB service is running (local)
- Verify IP whitelist settings (Atlas)
- Confirm credentials are correct
- Check network/firewall settings

### For MongoDB Atlas:
- Ensure your IP is whitelisted
- Check username/password
- Verify cluster is active

### For Local MongoDB:
- Ensure MongoDB service is running
- Check if port 27017 is available
- Verify no firewall blocking