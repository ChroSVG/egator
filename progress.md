# Progress Tracking

This file tracks the progress of fixing issues and improving the codebase.

## 🏁 Current Status
- [ ] Issue 001: Clean Code & Redundancy (0/14)
- [ ] Issue 002: Architecture, Modularity & Scalability (0/10)
- [ ] General Project Cleanup (0/3)

---

## 🛠️ Tasks

### Issue 001: Clean Code & Redundancy (Redundancy and Cleanup Plan)
- [x] 1. Move duplicate `uploadImage` code to `server/utils/uploadHelper.js`
- [x] 2. Fix inconsistent localStorage keys (`"currentUser"`)
- [x] 3. Remove dead `voteQueue.js` middleware
- [x] 4. Replace hard page reloads with React state/Redux updates
- [x] 5. Create `ProtectedRoute` wrapper for auth
- [x] 6. Remove duplicate `getElectionResults` from services
- [x] 7. Clean up unused `VoteCommand.validate()`
- [x] 8. Clean up `client/src/data.js` (dead code)
- [x] 9. Remove commented-out dead code in controllers
- [x] 10. Organize loose test scripts to `server/tests/scripts/`
- [ ] 11. Unify error message language to English
- [ ] 12. Handle `version` field properly or remove it
- [ ] 13. Create a simple client API service (`axiosConfig.js`)
- [ ] 14. Apply Open/Closed Principle to services (Dependency Injection)

### Issue 002: Modularity & Scalability (Modularity and Scalability Plan)
- [ ] 1. Restructure server into feature modules
- [ ] 2. Add centralized config management (`server/config/index.js`)
- [ ] 3. Standardize API response format
- [ ] 4. Add API versioning (`/api/v1`)
- [ ] 5. Add database indexes for scale
- [ ] 6. Client code splitting (lazy loading)
- [ ] 7. Make cleanup worker configurable
- [ ] 8. Extract shared validation rules
- [ ] 9. Add health check endpoint
- [ ] 10. Add structured logging

### General Project Cleanup (Project Cleanup Plan)
- [ ] 1. Move extra `.md` files to `docs`
- [ ] 2. Remove redundant root `package.json` (or unify)
- [ ] 3. Create `shared` folder for shared code

---

## 🗒️ Logs
- 2026-05-09: Initialized `progress.md` and started planning.
