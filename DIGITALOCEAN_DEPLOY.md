# Digital Ocean Deployment Guide - Smart Wi-Fi Attendance System

## 🌊 Deploy to Digital Ocean App Platform (Recommended)

### Step 1: Prepare Your Repository
Your code is already on GitHub at: `https://github.com/Spoilersignals/BBIT.git` ✅

### Step 2: Create Digital Ocean Account
1. Go to [DigitalOcean](https://www.digitalocean.com/)
2. Sign up or log in to your account
3. Add billing information (free tier available)

### Step 3: Set Up MongoDB Database
Choose one option:

#### Option A: MongoDB Atlas (Recommended)
1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create free account and cluster
3. Create database user and get connection string
4. Example: `mongodb+srv://username:password@cluster.mongodb.net/attendance`

#### Option B: Digital Ocean Managed Database
1. In DO dashboard, go to "Databases"
2. Create MongoDB cluster ($15/month minimum)
3. Get connection string from dashboard

### Step 4: Deploy to App Platform

#### 4.1 Create New App
1. Go to [DigitalOcean Apps](https://cloud.digitalocean.com/apps)
2. Click **"Create App"**
3. Select **"GitHub"** as source
4. Authorize DigitalOcean to access your GitHub
5. Select repository: `Spoilersignals/BBIT`
6. Select branch: `main`
7. Click **"Next"**

#### 4.2 Configure Backend Service
```yaml
Name: attendance-backend
Source Directory: /backend
Environment: Node.js
Build Phase: 
  Build Command: npm install
Run Phase:
  Run Command: npm start
HTTP Port: 5000
Instance Size: Basic ($5/month)
Instance Count: 1
```

**Environment Variables for Backend:**
```
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/attendance?retryWrites=true&w=majority
JWT_SECRET=your-super-secure-jwt-secret-here-256-bits
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-here-256-bits
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
CORS_ORIGIN=https://your-frontend-domain.ondigitalocean.app
```

#### 4.3 Configure Frontend Service
```yaml
Name: attendance-frontend  
Source Directory: /frontend
Environment: Node.js
Build Phase:
  Build Command: npm run build
Run Phase: 
  Run Command: serve -s build -l 3000
HTTP Port: 3000
Instance Size: Basic ($5/month)
Instance Count: 1
```

**Environment Variables for Frontend:**
```
REACT_APP_API_URL=https://your-backend-domain.ondigitalocean.app/api
REACT_APP_ENVIRONMENT=production
GENERATE_SOURCEMAP=false
```

#### 4.4 Review and Deploy
1. Review configuration
2. Click **"Create Resources"**
3. Wait for deployment (5-10 minutes)
4. Get your app URLs:
   - Frontend: `https://attendance-frontend-xxxxx.ondigitalocean.app`
   - Backend: `https://attendance-backend-xxxxx.ondigitalocean.app`

### Step 5: Update CORS Configuration
After deployment, update backend environment variables:
```
CORS_ORIGIN=https://your-actual-frontend-url.ondigitalocean.app
```

### Step 6: Test Your Deployment

#### 6.1 Health Check
Visit: `https://your-backend-url.ondigitalocean.app/api/health`
Should return: `{"status": "OK", "timestamp": "..."}`

#### 6.2 Frontend Access  
Visit: `https://your-frontend-url.ondigitalocean.app`
Should show login screen

#### 6.3 Create Admin Account
```bash
curl -X POST https://your-backend-url.ondigitalocean.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@university.edu",
    "password": "AdminPass123!",
    "firstName": "System",
    "lastName": "Administrator", 
    "role": "admin"
  }'
```

## 🚀 Alternative: Digital Ocean Droplet (VPS)

### Step 1: Create Ubuntu Droplet
1. Go to "Droplets" in DO dashboard
2. Create Droplet:
   - **Image**: Ubuntu 20.04 LTS
   - **Size**: Basic ($6/month minimum)
   - **Region**: Choose closest to users
   - **Authentication**: SSH Key (recommended)

### Step 2: Initial Server Setup
```bash
# SSH into your droplet
ssh root@your-droplet-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt-get update
apt-get install -y mongodb-org

# Install Nginx and PM2
apt-get install -y nginx
npm install -g pm2

# Start services
systemctl start mongod
systemctl enable mongod
systemctl start nginx
systemctl enable nginx
```

### Step 3: Deploy Application
```bash
# Clone your repository
git clone https://github.com/Spoilersignals/BBIT.git
cd BBIT

# Setup Backend
cd backend
npm install --production

# Create production environment file
cat > .env << EOF
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb://localhost:27017/attendance-system
JWT_SECRET=your-super-secure-jwt-secret-here
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-here
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
CORS_ORIGIN=https://yourdomain.com
EOF

# Start backend with PM2
pm2 start npm --name "attendance-api" -- start
pm2 startup
pm2 save

# Setup Frontend
cd ../frontend
npm install
npm run build

# Move build files to Nginx
rm -rf /var/www/html/*
cp -r build/* /var/www/html/
```

### Step 4: Configure Nginx
```bash
# Create Nginx configuration
cat > /etc/nginx/sites-available/attendance << 'EOF'
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Frontend
    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/attendance /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test and restart Nginx
nginx -t
systemctl restart nginx
```

### Step 5: Set Up SSL with Let's Encrypt
```bash
# Install Certbot
apt install certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Set up auto-renewal
crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔧 Configuration & Management

### Environment Variables
Update these in Digital Ocean App Platform or your `.env` file:

```env
# Required - Generate secure random strings
JWT_SECRET=use-openssl-rand-hex-32-to-generate
JWT_REFRESH_SECRET=use-openssl-rand-hex-32-to-generate

# Your MongoDB connection
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/attendance

# Your frontend URL (important for CORS)
CORS_ORIGIN=https://your-frontend-domain.com
```

### Initial System Setup

#### 1. Create Admin User
```bash
curl -X POST https://your-api-url/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@university.edu",
    "password": "SecurePassword123!",
    "firstName": "Admin",
    "lastName": "User",
    "role": "admin"
  }'
```

#### 2. Create Institution
```bash
curl -X POST https://your-api-url/api/institutions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "name": "Your University",
    "code": "YU",
    "ipRanges": ["192.168.1.0/24", "10.0.0.0/8"],
    "allowedSSIDs": ["University_WiFi", "Campus_Net"]
  }'
```

## 📊 Monitoring & Maintenance

### App Platform Monitoring
- View logs in DO dashboard
- Monitor resource usage
- Set up alerts for downtime

### Droplet Monitoring
```bash
# Check application status
pm2 status

# View application logs
pm2 logs attendance-api

# Monitor system resources
htop

# Check Nginx status
systemctl status nginx

# View Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Backup Strategy
```bash
# Database backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="mongodb://localhost:27017/attendance-system" --out=/backups/db_$DATE

# Upload to DO Spaces (optional)
# s3cmd put /backups/db_$DATE s3://your-backup-bucket/
```

## 💰 Cost Estimates

### App Platform (Managed)
- **Basic Plan**: ~$12/month for both services
- **Pro Plan**: ~$24/month for better performance
- **Database**: MongoDB Atlas free tier or $9/month

### Droplet (Self-Managed)  
- **Basic Droplet**: $6/month (1GB RAM, 1 CPU)
- **Recommended**: $12/month (2GB RAM, 1 CPU)
- **Domain**: ~$10/year
- **SSL**: Free with Let's Encrypt

## 🆘 Troubleshooting

### Common Issues

#### "Cannot GET /api" Error
**Solution**: Check CORS configuration and API URL

#### MongoDB Connection Failed
**Solution**: Verify connection string and network access

#### Frontend Shows Blank Page
**Solution**: Check build process and Nginx configuration

#### JWT Token Issues
**Solution**: Verify JWT secrets are properly set

### Getting Help
1. Check deployment logs in DO dashboard
2. Review error messages in browser console
3. Test API endpoints with curl or Postman
4. Verify environment variables are set correctly

---

Your Smart Wi-Fi Attendance System is now deployed on Digital Ocean! 🚀

**Next Steps:**
1. Configure your university's Wi-Fi IP ranges
2. Create lecturer and student accounts
3. Test attendance marking functionality
4. Set up monitoring and backups
