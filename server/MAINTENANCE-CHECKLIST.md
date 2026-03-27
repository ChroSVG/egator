# 📋 Maintenance Checklist - Quick Reference

Printable checklist untuk maintenance rutin.

---

## ✅ Daily Checklist

```
Date: _______________
Performed by: _______________

□ Server Status Check
  - pm2 status: ________ (online/offline)
  - Memory: ________ MB
  - CPU: ________ %

□ Error Log Review
  - Critical errors: ________
  - Warnings: ________
  - Action taken: _____________________________

□ Database Health
  - Connection count: ________
  - Slow queries: ________
  - Disk usage: ________ GB

□ Backup Verification
  - Last backup: ________
  - Backup size: ________ GB
  - Verified: Y / N

Notes:
_____________________________________________
_____________________________________________

Signature: _______________
```

---

## ✅ Weekly Checklist

```
Week: _______________
Performed by: _______________

□ Performance Review
  - Avg response time: ________ ms
  - P95 response time: ________ ms
  - Error rate: ________ %
  - Requests served: ________

□ Disk Usage
  - Server disk: ________ %
  - Uploads folder: ________ GB
  - Logs folder: ________ GB
  - Cleanup needed: Y / N

□ Dependency Updates
  - Packages to update: ________
  - Updates applied: ________
  - Tests passed: Y / N

□ Security Check
  - npm audit issues: ________
  - Fixed: Y / N
  - Suspicious activity: Y / N

Notes:
_____________________________________________
_____________________________________________

Signature: _______________
```

---

## ✅ Monthly Checklist

```
Month: _______________
Performed by: _______________

□ Database Backup
  - Full backup created: Y / N
  - Backup location: _________________________
  - Restore tested: Y / N
  - Backup size: ________ GB

□ Security Audit
  - Vulnerabilities found: ________
  - Critical: ________
  - All fixed: Y / N
  - Admin accounts reviewed: Y / N

□ Performance Optimization
  - Slow queries identified: ________
  - Indexes optimized: Y / N
  - Cache cleared: Y / N
  - Response time improved: Y / N

□ Data Cleanup
  - Expired data removed: Y / N
  - Orphaned records: ________
  - Archive created: Y / N

□ Documentation
  - Changelog updated: Y / N
  - API docs updated: Y / N
  - Known issues documented: Y / N

Notes:
_____________________________________________
_____________________________________________

Signature: _______________
```

---

## ✅ Quarterly Checklist

```
Quarter: Q__ 20____
Performed by: _______________

□ Load Testing
  - Load test passed: Y / N
  - Max throughput: ________ req/s
  - P99 response time: ________ ms
  - Bottlenecks found: ______________________

□ Architecture Review
  - Schema still optimal: Y / N
  - API design reviewed: Y / N
  - Security measures updated: Y / N
  - Scalability assessed: Y / N

□ Disaster Recovery Drill
  - Backup restore tested: Y / N
  - Recovery time: ________ minutes
  - RTO met (<1hr): Y / N
  - RPO met (<24hr): Y / N
  - Issues found: ____________________________

□ Major Updates
  - Node.js version: ________
  - MongoDB version: ________
  - Dependencies updated: ________
  - Breaking changes: ________________________

□ Planning
  - Next quarter goals: ______________________
  - Technical debt to address: _______________
  - Features to implement: ___________________

Notes:
_____________________________________________
_____________________________________________

Signature: _______________
```

---

## 🚨 Emergency Checklist

```
Incident Date: _______________
Detected by: _______________
Severity: Low / Medium / High / Critical

□ Initial Assessment
  - Issue identified: ________________________
  - Impact: _________________________________
  - Users affected: ________
  - Time detected: ________

□ Immediate Actions
  - Team notified: Y / N
  - Backup activated: Y / N
  - Users informed: Y / N
  - Logs preserved: Y / N

□ Resolution
  - Root cause: _____________________________
  - Fix applied: ____________________________
  - Tested: Y / N
  - Service restored: ________ (time)

□ Post-Incident
  - Incident report created: Y / N
  - Prevention measures: ____________________
  - Documentation updated: Y / N
  - Review scheduled: ________ (date)

Notes:
_____________________________________________
_____________________________________________

Signature: _______________
```

---

## 📊 Metrics Tracking Sheet

```
Month: _______________

| Week | Avg Response | P95 Response | Error Rate | Uptime | Incidents |
|------|--------------|--------------|------------|--------|-----------|
| 1    | _____ ms     | _____ ms     | _____ %    | _____% | _____     |
| 2    | _____ ms     | _____ ms     | _____ %    | _____% | _____     |
| 3    | _____ ms     | _____ ms     | _____ %    | _____% | _____     |
| 4    | _____ ms     | _____ ms     | _____ %    | _____% | _____     |

Monthly Average:
- Response Time: _____ ms (Target: <100ms)
- P95 Response: _____ ms (Target: <500ms)
- Error Rate: _____ % (Target: <1%)
- Uptime: _____ % (Target: >99.9%)

Trend: Improving / Stable / Declining

Action Items:
_____________________________________________
_____________________________________________
```

---

## 🔐 Security Audit Checklist

```
Audit Date: _______________
Auditor: _______________

□ Access Control
  - Admin accounts reviewed: ________
  - Inactive accounts removed: Y / N
  - Password policy enforced: Y / N
  - 2FA enabled: Y / N

□ API Security
  - Rate limiting active: Y / N
  - Authentication working: Y / N
  - Authorization working: Y / N
  - Input validation: Y / N

□ Data Security
  - Encryption at rest: Y / N
  - Encryption in transit: Y / N
  - Sensitive data masked: Y / N
  - Backups encrypted: Y / N

□ Infrastructure
  - Firewall rules reviewed: Y / N
  - Ports secured: Y / N
  - SSL certificate valid: Y / N
  - DDoS protection: Y / N

□ Dependencies
  - npm audit passed: Y / N
  - Critical vulnerabilities: ________
  - All patched: Y / N

Compliance: Pass / Fail
Next Audit: _______________

Signature: _______________
```

---

**Print Tips:**
- Print on A4 paper
- Keep in maintenance binder
- Use clipboard for field work
- Store completed forms for 1 year

**Digital Version:**
- Save as PDF
- Use in project management tool
- Share with team members
