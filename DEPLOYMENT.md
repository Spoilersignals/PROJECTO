# Deployment Guide - Smart Wi-Fi Attendance System

## 🐳 Docker Deployment (Recommended)

### Prerequisites
- Docker and Docker Compose installed
- 4GB+ RAM available
- Ports 80, 443, 3000, 5000 available

### Quick Deploy with Docker
```bash
# Clone or download project
git clone <repository-url>
cd PROJECT

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Services Included:
- **MongoDB**: Database on port 27017
- **Backend API**: Node.js server on port 5000  
- **Frontend**: React app on port 3000
- **Nginx**: Reverse proxy on ports 80/443

## ☁️ Cloud Deployment Options

### 1. Heroku Deployment

#### Backend Setup:
```bash
# Install Heroku CLI
# Create backend app
heroku create attendance-system-api

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secure-jwt-secret
heroku config:set MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/attendance

# Deploy backend
cd backend
git init
git add .
git commit -m "Initial backend"
heroku git:remote -a attendance-system-api
git push heroku main
```

#### Frontend Setup:
```bash
# Create frontend app
heroku create attendance-system-web

# Set build configuration
heroku config:set REACT_APP_API_URL=https://attendance-system-api.herokuapp.com/api

# Deploy frontend
cd frontend
git init
git add .
git commit -m "Initial frontend"
heroku git:remote -a attendance-system-web
git push heroku main
```

### 2. AWS Deployment

#### EC2 Instance Setup:
```bash
# Launch Ubuntu 20.04 LTS instance
# SSH into instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Install dependencies
sudo apt update
sudo apt install nodejs npm mongodb nginx certbot

# Clone project
git clone <repository-url>
cd PROJECT

# Setup backend
cd backend
npm install --production
sudo npm install -g pm2

# Start backend with PM2
pm2 start ecosystem.config.js
pm2 startup
pm2 save

# Build frontend
cd ../frontend
npm install
npm run build

# Configure Nginx
sudo cp nginx.conf /etc/nginx/sites-available/attendance
sudo ln -s /etc/nginx/sites-available/attendance /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL with Let's Encrypt
sudo certbot --nginx -d yourdomain.com
```

### 3. DigitalOcean App Platform

#### Deploy via GitHub:
1. Fork the repository to your GitHub
2. Connect DigitalOcean App Platform to GitHub
3. Create new app and select your repository
4. Configure services:

**Backend Service:**
```yaml
name: backend
source_dir: /backend
github:
  repo: your-username/attendance-system
  branch: main
run_command: npm start
environment_slug: node-js
instance_count: 1
instance_size_slug: basic-xxs
envs:
- key: NODE_ENV
  value: production
- key: JWT_SECRET
  value: your-secure-secret
- key: MONGODB_URI
  value: your-mongodb-connection-string
```

**Frontend Service:**
```yaml
name: frontend
source_dir: /frontend
github:
  repo: your-username/attendance-system
  branch: main
build_command: npm run build
environment_slug: node-js
instance_count: 1
instance_size_slug: basic-xxs
envs:
- key: REACT_APP_API_URL
  value: ${backend.PUBLIC_URL}/api
```

## 🔒 SSL/TLS Configuration

### Let's Encrypt (Free SSL)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Cloudflare SSL (Alternative)
1. Sign up for Cloudflare
2. Add your domain
3. Update nameservers
4. Enable SSL/TLS encryption mode: "Full (strict)"
5. Enable "Always Use HTTPS"

## 📊 Production Configuration

### Environment Variables

#### Backend (.env.production):
```env
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/attendance?retryWrites=true&w=majority
JWT_SECRET=super-secure-jwt-secret-256-bits-minimum
JWT_REFRESH_SECRET=super-secure-refresh-secret-256-bits-minimum
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
CORS_ORIGIN=https://yourfrontenddomain.com
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

#### Frontend (.env.production):
```env
REACT_APP_API_URL=https://yourbackenddomain.com/api
REACT_APP_ENVIRONMENT=production
GENERATE_SOURCEMAP=false
```

### Security Checklist:
- [ ] Use strong, unique JWT secrets (256+ bits)
- [ ] Enable HTTPS with valid SSL certificates
- [ ] Configure CORS for specific domains only
- [ ] Set up rate limiting on API endpoints
- [ ] Use secure MongoDB connection strings
- [ ] Enable MongoDB authentication
- [ ] Configure firewall rules
- [ ] Set up monitoring and logging
- [ ] Enable automatic security updates
- [ ] Use environment variables for all secrets

## 📈 Monitoring & Logging

### PM2 Monitoring:
```bash
# View processes
pm2 list

# Monitor logs
pm2 logs

# Monitor system resources
pm2 monit

# Restart application
pm2 restart all
```

### Log Management:
```bash
# Rotate logs
pm2 install pm2-logrotate

# Configure log rotation
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### MongoDB Monitoring:
```bash
# Check database stats
mongo --eval "db.stats()"

# Monitor connections
mongo --eval "db.serverStatus().connections"
```

## 🔄 Backup Strategy

### Database Backup:
```bash
# Create backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mongodump --uri="mongodb://user:pass@host/attendance" --out=/backups/attendance_$DATE

# Automate with cron
0 2 * * * /path/to/backup-script.sh
```

### File System Backup:
```bash
# Backup uploads and logs
tar -czf attendance_files_$(date +%Y%m%d).tar.gz uploads/ logs/

# Upload to cloud storage (AWS S3)
aws s3 cp attendance_files_$(date +%Y%m%d).tar.gz s3://your-backup-bucket/
```

## 🚀 Performance Optimization

### Backend Optimizations:
```javascript
// Enable compression
app.use(compression());

// Set cache headers
app.use(express.static('public', {
  maxAge: '1y',
  etag: false
}));

// Connection pooling
mongoose.connect(uri, {
  maxPoolSize: 10,
  bufferMaxEntries: 0
});
```

### Frontend Optimizations:
```javascript
// Code splitting
const LazyComponent = React.lazy(() => import('./Component'));

// Service worker for caching
// Implemented in build process

// Optimize images
// Use WebP format where possible
```

### Database Indexing:
```javascript
// Add indexes for common queries
db.users.createIndex({ "email": 1 });
db.sessions.createIndex({ "course": 1, "date": -1 });
db.attendance.createIndex({ "session": 1, "student": 1 });
db.attendance.createIndex({ "createdAt": 1 });
```

## 🔧 Maintenance

### Regular Tasks:
- [ ] Update dependencies monthly
- [ ] Review security logs weekly  
- [ ] Test backup restoration quarterly
- [ ] Monitor disk space usage
- [ ] Check SSL certificate expiration
- [ ] Review API performance metrics
- [ ] Update documentation as needed

### Health Checks:
```bash
# API health check
curl -f http://localhost:5000/api/health || exit 1

# Database connectivity
mongo --eval "db.runCommand('ping')" || exit 1

# Frontend accessibility
curl -f http://localhost:3000 || exit 1
```

---

Your Smart Wi-Fi Bound Attendance System is now production-ready with comprehensive deployment options and monitoring capabilities!
