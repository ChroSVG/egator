# Issue #2: Make Project More Modular & Scalable

**Goal**: Organize the code so it's easy to add features (modular) and handles more users (scalable). Simple language for juniors and cheap AI.

---

## 🔴 High Priority

### 1. Restructure server into feature modules

**Where**: `server/` — currently organized by layer (controllers/, services/, repositories/, models/ separately)

**Problem**: To understand one feature (e.g., "Elections"), you must open 4 different folders. Adding a new feature means creating files in 4+ folders. Hard to navigate.

**Fix**: Group by feature instead:

```
server/
  features/
    elections/
      electionController.js
      electionService.js
      electionRepository.js
      electionModel.js
    candidates/
      candidateController.js
      candidateService.js
      candidateRepository.js
      candidateModel.js
    voting/
      votingService.js
      voteRecordRepository.js
      voteRecordModel.js
      voteCommand.js
    auth/
      voterController.js
      authService.js
      voterRepository.js
      voterModel.js
  shared/
    middleware/
    utils/
    baseRepository.js
    container.js
    routes.js
```

Each feature folder is self-contained. Add a feature = add one folder.

**For junior/AI**: "Put everything about 'Elections' in one folder. Put everything about 'Candidates' in another folder. Easy to find, easy to add."

---

### 2. Add centralized config management

**Where**: `server/.env`, `client/.env` — scattered env vars

**Problem**: Config values (DB URL, JWT secret, Cloudinary keys, API URL) are read directly from `process.env` in multiple files. No single source of truth.

**Fix**: Create `server/config/index.js`:

```js
const config = {
    port: process.env.PORT || 5000,
    mongoUri: process.env.MONGO_URI,
    jwtSecret: process.env.JWT_SECRET,
    cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET
    },
    rateLimit: { windowMs: 15 * 60 * 1000, max: 100 }
};
module.exports = config;
```

Every file reads from `config`, not `process.env` directly.

**For junior/AI**: "Put all your settings in one config file. One place to check, one place to change."

---

### 3. Standardize API response format

**Where**: All controllers return different shapes of JSON

**Problem**: Some responses return `{ data: ... }`, others return `{ message, candidate: ... }`, others return raw arrays. Frontend doesn't know what to expect.

**Fix**: Every response follows the same shape:

```js
{
    success: true/false,
    data: { ... },
    error: { message: "...", code: 400 },
    meta: { page, limit, total } // only for paginated
}
```

Create `server/utils/apiResponse.js`:

```js
exports.success = (res, data, meta, status = 200) => { ... }
exports.error = (res, message, code, status = 400) => { ... }
exports.paginated = (res, data, pagination) => { ... }
```

**For junior/AI**: "Every API reply looks the same. Frontend always knows what to expect. No surprises."

---

### 4. Add API versioning

**Where**: Routes have no prefix like `/api/v1/`

**Problem**: When you change an API, old apps break. No way to have v1 (old) and v2 (new) side by side.

**Fix**: Prefix all routes with `/api/v1/`:

```js
// In index.js
app.use('/api/v1', routes);
```

**For junior/AI**: "Put `/api/v1/` in front of all endpoints. Later you can make `/api/v2/` without breaking the old app."

---

## 🟡 Medium Priority

### 5. Add database indexes for scale

**Where**: `server/models/*.js`

**Problem**: No explicit indexes on frequently queried fields (election status, candidate name, vote records by voter+election). As data grows, queries slow down.

**Fix**: Add indexes to Mongoose schemas:
- `voteRecordModel.js`: compound unique index on `{ voter, election }` (already exists — verify)
- `electionModel.js`: index on `{ status, startDate, endDate }`
- `voterModel.js`: index on `{ email }`, `{ isAdmin }`
- `candidateModel.js`: index on `{ elections }`

**For junior/AI**: "Add database indexes on fields you search by. Makes queries fast when you have 10,000 voters instead of 10."

---

### 6. Client code splitting (lazy loading)

**Where**: `client/src/App.jsx` — all pages imported eagerly

**Problem**: The entire app (Login, Register, Elections, Candidates, Result, etc.) is loaded when the user first opens the page. Slow for users with weak internet.

**Fix**: Use `React.lazy()` and `Suspense`:

```jsx
const Login = lazy(() => import('./pages/Login'));
const Elections = lazy(() => import('./pages/Elections'));

<Suspense fallback={<Loader />}>
    <Routes>...existing routes...</Routes>
</Suspense>
```

**For junior/AI**: "Load the Login page only when user clicks Login. Don't load everything at once. Makes the app start faster."

---

### 7. Make cleanup worker configurable

**Where**: `server/workers/cleanupWorker.js`

**Problem**: Cron schedule is hardcoded. If you deploy to multiple servers, every instance runs the same cleanup job.

**Fix**: Read cron schedule and feature flag from config:

```js
const { cleanupEnabled, cleanupSchedule } = require('../config');
if (cleanupEnabled) {
    cron.schedule(cleanupSchedule, () => { ... });
}
```

**For junior/AI**: "Put the schedule and on/off switch in config. Don't hardcode when cleanup runs."

---

### 8. Extract shared validation rules

**Where**: Some validation logic exists on both client and server (e.g., email format, password rules)

**Problem**: Duplicated logic. Server validates "password must be 6+ chars", client validates the same. If one changes, the other gets out of sync.

**Fix**: Create `shared/validators.js` used by both. Or at minimum, document the shared rules.

```js
// shared/validators.js
export const PASSWORD_MIN_LENGTH = 6;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

**For junior/AI**: "If both frontend and backend check the same thing, put the rules in one shared file."

---

## 🟢 Low Priority

### 9. Add health check endpoint

**Where**: Server has no `/health` endpoint

**Problem**: Can't easily check if the server is alive, or if DB/Redis are connected.

**Fix**:

```js
app.get('/api/v1/health', (req, res) => {
    res.json({
        status: 'ok',
        db: mongoose.connection.readyState === 1,
        uptime: process.uptime()
    });
});
```

**For junior/AI**: "Add a `/health` endpoint so deployment tools can check if the server is alive."

---

### 10. Add structured logging

**Where**: Uses `morgan` for HTTP logs and `console.log` everywhere else

**Problem**: `console.log` has no levels (info/warn/error), no JSON format, hard to search logs in production.

**Fix**: Use a logger wrapper that supports levels and JSON output:

```js
// utils/logger.js
const logger = {
    info: (msg, meta) => console.log(JSON.stringify({ level: 'info', msg, meta, time: new Date() })),
    error: (msg, meta) => console.error(JSON.stringify({ level: 'error', msg, meta, time: new Date() })),
};
```

**For junior/AI**: "Don't use `console.log`. Use a logger that adds timestamps and levels so you can search logs later."

---

## Summary

| Priority | Tasks | Estimated Time |
|----------|-------|---------------|
| 🔴 High | 4 tasks | ~3-4 hours |
| 🟡 Medium | 4 tasks | ~2-3 hours |
| 🟢 Low | 2 tasks | ~1 hour |
| **Total** | **10 tasks** | **~6-8 hours** |

---

> **For Junior Programmers**: Each task is independent. Start with feature restructuring (High #1) — it changes the folder layout so later tasks will be easier to place.
>
> **For Cheap AI Models**: Tasks have clear "Before" and "After" code examples. The `Where` tells you exact files. Just follow the pattern.
