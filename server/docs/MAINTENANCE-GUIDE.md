# 📋 Egator Project Maintenance Guide

Panduan maintenance untuk aplikasi voting Egator (Many-to-Many Election-Candidate System).

---

## 🔄 Maintenance Schedule

### **Daily (Harian)**
- [ ] Check server health
- [ ] Monitor error logs
- [ ] Check database connections
- [ ] Verify backup status

### **Weekly (Mingguan)**
- [ ] Review performance metrics
- [ ] Check disk usage
- [ ] Review slow queries
- [ ] Update dependencies (patch version)

### **Monthly (Bulanan)**
- [ ] Full database backup
- [ ] Security audit
- [ ] Performance optimization
- [ ] Update dependencies (minor version)
- [ ] Review user feedback

### **Quarterly (3 Bulanan)**
- [ ] Major version updates
- [ ] Architecture review
- [ ] Load testing
- [ ] Disaster recovery drill
- [ ] Documentation update

---

## 🛠️ Daily Maintenance Tasks

### 1. **Server Health Check**

```bash
# Check if server is running
pm2 status egator-server

# Check server logs
pm2 logs egator-server --lines 50

# Check memory usage
pm2 monit
```

**Expected:**
- Status: `online`
- Memory: < 512MB
- CPU: < 50%
- No error logs

---

### 2. **Database Health**

```bash
# MongoDB connection check
mongosh --eval "db.adminCommand('ping')"

# Check database size
mongosh --eval "db.stats()"

# Check active connections
mongosh --eval "db.serverStatus().connections"
```

**Expected:**
- Connection count: < 100
- Database size: Growing normally
- No slow queries (>1000ms)

---

### 3. **Error Log Review**

```bash
# Check application errors
tail -100 logs/error.log | grep -i "error\|exception"

# Check MongoDB errors
mongosh --eval "db.getProfilingStatus()"

# Check Cloudinary errors
grep -i "cloudinary\|upload" logs/error.log
```

**Action Items:**
- Investigate recurring errors
- Fix critical bugs immediately
- Document unknown errors

---

## 📊 Weekly Maintenance Tasks

### 1. **Performance Metrics Review**

```bash
# Check API response times
# Use monitoring tool or check logs

# Check database query performance
mongosh --eval "db.system.profile.find().sort({\$natural: -1}).limit(10)"

# Check cache hit rate (if using Redis)
redis-cli INFO stats | grep keyspace
```

**Metrics to Track:**
| Metric | Target | Alert If |
|--------|--------|----------|
| Avg Response Time | < 100ms | > 500ms |
| P95 Response Time | < 500ms | > 1000ms |
| Error Rate | < 1% | > 5% |
| Database Query Time | < 50ms | > 200ms |

---

### 2. **Disk Usage Check**

```bash
# Check disk space
df -h

# Check uploads folder size
du -sh uploads/

# Check log file sizes
du -sh logs/*.log
```

**Action:**
- Delete old logs (>30 days)
- Clean up temp files
- Archive old uploads

---

### 3. **Dependency Updates (Patch)**

```bash
# Check for patch updates
npm outdated

# Update patch versions (x.x.PATCH)
npm update

# Run tests after update
npm test

# Restart server
pm2 restart egator-server
```

**Version Strategy:**
- ✅ PATCH: Auto-update (x.x.**1** → x.x.**2**)
- ⚠️ MINOR: Review first (x.**1**.0 → x.**2**.0)
- ❌ MAJOR: Plan migration (**1**.0.0 → **2**.0.0)

---

## 🗓️ Monthly Maintenance Tasks

### 1. **Database Backup**

```bash
# Full database backup
mongodump --uri="mongodb://localhost:27017/egator" \
  --out=backups/mongodb-$(date +%Y%m%d)

# Verify backup
mongorestore --dryRun backups/mongodb-$(date +%Y%m%d)/egator

# Upload to cloud storage (optional)
aws s3 cp backups/mongodb-$(date +%Y%m-d) s3://your-bucket/backups/
```

**Backup Schedule:**
- Daily: Incremental backup
- Weekly: Full backup
- Monthly: Archive backup (keep 12 months)

---

### 2. **Security Audit**

```bash
# Check for vulnerable dependencies
npm audit

# Fix critical vulnerabilities
npm audit fix --force

# Check for exposed ports
nmap -p 1-65535 localhost

# Review user permissions
mongosh --eval "db.getUsers()"
```

**Security Checklist:**
- [ ] No critical vulnerabilities
- [ ] All ports secured
- [ ] Admin accounts reviewed
- [ ] API keys rotated (quarterly)
- [ ] SSL certificate valid

---

### 3. **Performance Optimization**

```bash
# Analyze slow queries
mongosh --eval "db.system.profile.find({ millis: { \$gt: 100 } }).sort({\$natural: -1}).limit(10)"

# Check indexes usage
mongosh --eval "db.candidates.aggregate([{ \$indexStats: {} }])"

# Rebuild indexes if needed
mongosh --eval "db.candidates.reIndex()"
```

**Optimization Tasks:**
- Add missing indexes
- Remove unused indexes
- Optimize slow queries
- Clear cache

---

### 4. **Data Cleanup**

```javascript
// MongoDB cleanup scripts

// 1. Remove expired idempotency keys (>24 hours)
db.idempotencies.deleteMany({ 
  createdAt: { $lt: new Date(Date.now() - 24*60*60*1000) } 
});

// 2. Archive old vote records (>1 year)
db.voteRecords.aggregate([
  { $match: { votedAt: { $lt: new Date(Date.now() - 365*24*60*60*1000) } } },
  { $out: "voteRecords_archive" }
]);

// 3. Remove orphaned candidates (no elections)
db.candidates.deleteMany({ elections: { $size: 0 } });

// 4. Remove inactive elections (>2 years, not active)
db.elections.deleteMany({ 
  isActive: false,
  createdAt: { $lt: new Date(Date.now() - 2*365*24*60*60*1000) }
});
```

---

## 📈 Quarterly Maintenance Tasks

### 1. **Load Testing**

```bash
# Run load test
node load-test.js

# Run stress test
node stress-test.js

# Run concurrency test
node concurrency-test.js
```

**Metrics to Verify:**
- [ ] Throughput > 300 req/s
- [ ] Success rate > 99%
- [ ] P99 response time < 1000ms
- [ ] No memory leaks

---

### 2. **Architecture Review**

**Review Areas:**
- [ ] Database schema still optimal
- [ ] API design follows best practices
- [ ] Security measures up-to-date
- [ ] Scalability for expected growth
- [ ] Third-party services (Cloudinary, etc.)

**Questions to Ask:**
- Can we handle 10x more users?
- Are there single points of failure?
- Is disaster recovery plan tested?
- Is documentation up-to-date?

---

### 3. **Disaster Recovery Drill**

**Scenario 1: Database Crash**
```bash
# 1. Restore from backup
mongorestore --uri="mongodb://localhost:27017/egator" \
  backups/mongodb-20260327/egator

# 2. Verify data
mongosh --eval "db.elections.countDocuments()"

# 3. Test application
curl http://localhost:5000/api/elections
```

**Scenario 2: Server Crash**
```bash
# 1. Start backup server
pm2 start index.js --name egator-server-backup

# 2. Verify health
curl http://localhost:5001/api/elections

# 3. Update DNS/load balancer
```

**Recovery Time Objective (RTO):** < 1 hour
**Recovery Point Objective (RPO):** < 24 hours

---

## 🔧 Common Maintenance Tasks

### Add New Admin User

```bash
node create-admin.js
```

**Or via API:**
```bash
curl -X POST http://localhost:5000/api/voters/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "New Admin",
    "email": "admin2@example.com",
    "password": "Admin@123456",
    "password2": "Admin@123456"
  }'

# Then manually set isAdmin in database
mongosh --eval "db.voters.updateOne({email: 'admin2@example.com'}, {$set: {isAdmin: true}})"
```

---

### Reset Admin Password

```bash
# In MongoDB
mongosh --eval "
db.voters.updateOne(
  { email: 'admin@example.com' },
  { \$set: { password: '\$2a\$10\$...' } }  // Hashed password
)
"
```

**Generate hash:**
```javascript
const bcrypt = require('bcryptjs');
bcrypt.hash('NewPassword@123', 10).then(console.log);
```

---

### Clear Cache

```bash
# If using Redis
redis-cli FLUSHDB

# If using in-memory cache
pm2 restart egator-server
```

---

### Database Migration

```bash
# Run migration script
node migrations/fix-candidate-election-field.js

# Verify migration
mongosh --eval "db.candidates.findOne({ elections: { \$exists: true } })"
```

---

## 📝 Maintenance Log Template

```markdown
## Maintenance Log - YYYY-MM-DD

**Performed by:** [Name]
**Duration:** [Start] - [End]

### Tasks Completed:
- [ ] Server health check
- [ ] Database backup
- [ ] Log review
- [ ] Performance metrics
- [ ] Security audit

### Issues Found:
1. [Issue description]
   - **Severity:** Low/Medium/High/Critical
   - **Action:** [What was done]
   - **Status:** Resolved/Pending

### Changes Made:
- Updated package: [name] from x.x.x to x.x.x
- Configuration change: [description]
- Database migration: [description]

### Next Maintenance:
- **Date:** YYYY-MM-DD
- **Priority Tasks:** [List]

### Notes:
[Any additional information]
```

---

## 🚨 Emergency Procedures

### Server Down

1. **Check Status:**
   ```bash
   pm2 status
   ping localhost
   ```

2. **Restart Server:**
   ```bash
   pm2 restart egator-server
   ```

3. **Check Logs:**
   ```bash
   pm2 logs egator-server --lines 100
   ```

4. **If Still Down:**
   - Start backup server
   - Investigate root cause
   - Restore from backup if needed

---

### Database Corruption

1. **Stop Application:**
   ```bash
   pm2 stop egator-server
   ```

2. **Assess Damage:**
   ```bash
   mongosh --eval "db.adminCommand('repairDatabase')"
   ```

3. **Restore from Backup:**
   ```bash
   mongorestore --uri="mongodb://localhost:27017/egator" \
     backups/mongodb-YYYYMMDD/egator
   ```

4. **Verify & Restart:**
   ```bash
   pm2 start egator-server
   curl http://localhost:5000/api/elections
   ```

---

### Security Breach

1. **Immediate Actions:**
   - Rotate all API keys
   - Change all admin passwords
   - Review access logs
   - Enable enhanced logging

2. **Investigate:**
   - Check for unauthorized access
   - Review API logs
   - Check database for modifications

3. **Remediate:**
   - Patch vulnerabilities
   - Update firewall rules
   - Notify affected users if needed

---

## 📞 Support Contacts

| Service | Contact | Status Page |
|---------|---------|-------------|
| MongoDB Atlas | support@mongodb.com | status.mongodb.com |
| Cloudinary | support@cloudinary.com | status.cloudinary.com |
| Server Hosting | [Your provider] | [Status page] |

---

## 📚 Related Documentation

- `LOAD-TESTING.md` - Performance testing guide
- `CONCURRENCY-ANALYSIS.md` - Concurrency analysis
- `CANDIDATE-ELECTION-MANAGEMENT.md` - Candidate management API
- `FIX-ELECTION-CANDIDATES.md` - Bug fix documentation

---

**Last Updated:** 2026-03-27
**Version:** 1.0.0
**Maintained By:** Development Team
