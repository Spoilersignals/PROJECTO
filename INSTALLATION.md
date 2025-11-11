# Installation Guide for New PC

This guide will help you install and run the Smart Wi-Fi Bound Attendance System on a new computer.

## 📋 Prerequisites

Before starting, ensure you have:

1. **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
2. **MongoDB** - Choose one:
   - Local installation - [Download here](https://www.mongodb.com/try/download/community)
   - MongoDB Atlas (Cloud) - [Sign up here](https://www.mongodb.com/atlas)
3. **Git** - [Download here](https://git-scm.com/downloads)

## 🔽 Step 1: Clone the Repository

Open terminal/command prompt and run:

```bash
git clone https://github.com/Spoilersignals/PROJECTO.git
cd PROJECTO
```

## ⚙️ Step 2: Backend Setup

### Install Dependencies
```bash
cd backend
npm install
```

### Configure Environment Variables
Create a `.env` file in the `backend` folder:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/attendance-system
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
```

**Important**: Change the JWT secrets to secure random strings!

### Start MongoDB

**Option A - Local MongoDB:**
```bash
mongod
```

**Option B - MongoDB Atlas:**
1. Create account and cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Get connection string
3. Update `MONGODB_URI` in `.env` file

### Run Backend Server
```bash
npm run dev
```

Backend will be available at `http://localhost:5000`

## 🎨 Step 3: Frontend Setup

Open a **new terminal** window:

```bash
cd frontend
npm install
npm start
```

Frontend will be available at `http://localhost:3000`

## ✅ Step 4: Verify Installation

1. Open browser and go to `http://localhost:3000`
2. You should see the login page
3. Backend API is running at `http://localhost:5000`

## 🏫 Step 5: Initial Configuration (Optional)

### Create Admin Account

Use the registration endpoint or sign up through the UI with role "admin":

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"admin@university.edu\",
    \"password\": \"AdminPass123!\",
    \"firstName\": \"System\",
    \"lastName\": \"Administrator\",
    \"role\": \"admin\"
  }"
```

### Configure Institution Wi-Fi Settings

Update IP ranges to match your institution's network in the admin dashboard or via API.

## 🚨 Troubleshooting

### Backend won't start
- Check if MongoDB is running
- Verify `.env` file exists and has correct values
- Ensure port 5000 is not in use

### Frontend won't start
- Check if Node.js is installed correctly
- Delete `node_modules` and run `npm install` again
- Ensure port 3000 is not in use

### Database connection error
- Verify MongoDB is running
- Check `MONGODB_URI` in `.env` file
- For Atlas: check network access and IP whitelist

### CORS errors
- Ensure backend is running on port 5000
- Check CORS configuration in backend

## 📝 Quick Commands Reference

```bash
# Start backend (from backend folder)
npm run dev

# Start frontend (from frontend folder)
npm start

# Start MongoDB locally
mongod

# Check if servers are running
# Backend: http://localhost:5000
# Frontend: http://localhost:3000
```

## 🔐 Production Deployment

For production deployment on cloud platforms:
- See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment guides
- See [DIGITALOCEAN_DEPLOY.md](DIGITALOCEAN_DEPLOY.md) for DigitalOcean specific instructions

## 📞 Need Help?

If you encounter issues:
1. Check the [SETUP.md](SETUP.md) file for detailed configuration
2. Review the [README.md](README.md) for project overview
3. Check server logs for error messages
4. Ensure all prerequisites are installed correctly

---

Your system is now ready to use! 🎉
