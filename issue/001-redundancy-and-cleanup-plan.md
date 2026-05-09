# Issue #1: Make Project Less Redundant & Clean

**Goal**: Clean up this voting app so junior programmers and cheap AI (like GPT-4o-mini, Claude Haiku, Gemini Flash) can easily read and work on it.

---

## 🔴 High Priority (Do First)

### 1. Move duplicate `uploadImage` code to one shared file

**Where**: `server/services/electionService.js` and `server/services/candidateService.js`

**Problem**: Both files have the exact same `uploadImage(file, folder)` function — save file to local, send to Cloudinary, delete local. Copy-pasted twice.

**Fix**: Create `server/utils/uploadHelper.js` with this one function. Both services call it instead.

**For junior/AI**: "If you type the same code twice, stop. Put it in one file and `import` it."

---

### 2. Fix inconsistent localStorage keys

**Where**: `client/src/pages/Login.jsx` uses key `"currentUser"`, but `client/src/store/vote-slice.js` reads key `"currentVoter"`.

**Problem**: These are different keys. If you log in, one part of the app can't find the data. Logout has to delete both keys manually. This is a bug.

**Fix**: Pick ONE key name (`"currentUser"`) and use it everywhere.

**For junior/AI**: "Use the same key name when saving and reading from localStorage. Pick one, stick to it."

---

### 3. Remove dead `voteQueue.js` middleware

**Where**: `server/middleware/voteQueue.js` (153 lines)

**Problem**: This file is fully written but **never imported anywhere**. It's dead code that makes the project bigger for no reason.

**Fix**: Delete the file, or if the feature is planned, add it to routes and uncomment usage.

**For junior/AI**: "If a file is never imported, delete it. Dead code is just noise."

---

### 4. Replace hard page reloads with React state updates

**Where**:
- `client/src/components/AddElectionModal.jsx` → `window.location.reload()`
- `client/src/components/UpdateElectionModal.jsx` → `navigate(0)`
- `client/src/components/AddCandidateModal.jsx` → `window.location.reload()`
- `client/src/components/ElectionCandidate.jsx` → `navigate(0)`

**Problem**: Full page refreshes are slow and ugly. The app uses Redux but ignores it for data updates.

**Fix**: After a successful API call, update Redux state or re-fetch the data silently.

**For junior/AI**: "Don't refresh the whole page. Just update the data in Redux. It's faster and smoother."

---

## 🟡 Medium Priority

### 5. Create `ProtectedRoute` wrapper for auth

**Where**: `client/src/pages/Elections.jsx`, `Candidates.jsx`, `ElectionDetails.jsx`

**Problem**: 3 pages have the same copy-pasted `useEffect`:
```jsx
useEffect(() => {
  if (!token) Navigate('/login');
}, [token]);
```

**Fix**: Make one `<ProtectedRoute>` component, wrap pages with it.

**For junior/AI**: "Don't copy-paste the same guard code. Make one component that checks login, then wrap your pages with it."

---

### 6. Remove duplicate `getElectionResults` from one service

**Where**: `server/services/electionService.js` and `server/services/votingService.js`

**Problem**: Both have the same function that just calls the same repository. Does the same work twice.

**Fix**: Keep it only in one place (e.g. `electionService`), make the other one call it.

**For junior/AI**: "Don't write the same function in two files. Keep one, and have the other file use it."

---

### 7. Clean up unused `VoteCommand.validate()`

**Where**: `server/commands/voteCommand.js`

**Problem**: `VoteCommand.validate()` runs checks (voter exists, candidate exists, etc.), but `votingService.castVote()` runs the same checks again. So the command's validation is wasted work.

**Fix**: Either remove validation from the command, or remove it from the service. Don't do both.

**For junior/AI**: "Don't validate the same thing twice. Pick one layer to validate. The other layer trusts it."

---

### 8. Clean up `client/src/data.js` (dead code)

**Where**: `client/src/data.js` — 155 lines of fake data

**Problem**: This file is not imported anywhere. It's dead code with celebrity photos.

**Fix**: Delete it, or move it to a `_archive` folder if someone wants it later.

**For junior/AI**: "If nothing imports a file, it's dead. Delete it. Git remembers history if you need it back."

---

## 🟢 Low Priority (Nice to Clean)

### 9. Remove commented-out dead code

**Where**: Multiple controller files have lines like `// if (!req.user.isAdmin) { throw new HttpError(...) }`

**Problem**: Makes code harder to read. If it's not needed, delete it.

**Fix**: Search for `//` in controllers and remove commented-out code.

---

### 10. Organize loose test scripts

**Where**: `server/` root has `stress-test.js`, `load-test.js`, `concurrency-test.js`, etc.

**Problem**: Mixed with real source files. Confusing.

**Fix**: Move them to `server/tests/scripts/`.

---

### 11. Unify error message language (English only)

**Where**: Mix of Indonesian and English error messages

**Problem**: Inconsistent. A user might get "Nama lengkap wajib diisi" in one place and "Email is required" in another.

**Fix**: Pick one language (English) for all messages.

---

### 12. Handle `version` field properly or remove it

**Where**: `server/models/candidateModel.js` has `version` field for optimistic concurrency

**Problem**: It's incremented but never checked. It does nothing.

**Fix**: Either implement actual version check before writes, or remove the field.

---

### 13. Create a simple client API service

**Where**: Client files call `axios` directly in every component

**Problem**: Duplicate `axios.create()`, base URL config, and error handling in every page.

**Fix**: Create one `client/src/api.js` that exports pre-configured API functions.

**For junior/AI**: "Put all your API calls in one file. Every page uses that file. If the API URL changes, you change it in one place."

---

### 14. Apply Open/Closed Principle to services (Dependency Injection)

**Where**: `server/services/*.js` — all 4 service files

**Problem**: Every service creates its own dependencies in the constructor:
```js
constructor() {
    this.candidateRepository = new CandidateRepository();
    this.electionRepository = new ElectionRepository();
}
```
To add a new feature (e.g., a different vote-counting method), you must **modify** existing services. This violates Open/Closed — code should be open for extension, closed for modification.

**Fix**: Use **Dependency Injection**. Pass repositories into the constructor instead of creating them inside. Then add a simple DI container (`server/utils/container.js`) that wires everything together.

```js
// Before (tight coupling — hard to extend)
constructor() {
    this.candidateRepository = new CandidateRepository();
}

// After (injected — open for extension)
constructor({ candidateRepository, electionRepository }) {
    this.candidateRepository = candidateRepository;
    this.electionRepository = electionRepository;
}
```

Then you can swap or extend implementations without touching the service.

**For junior/AI**: "Don't let services create their own tools. Give them tools from outside. That way you can add new features without changing old code."

---

## Summary of Effort

| Priority | Tasks | Estimated Time |
|----------|-------|---------------|
| 🔴 High | 5 tasks | ~3-4 hours |
| 🟡 Medium | 4 tasks | ~1-2 hours |
| 🟢 Low | 5 tasks | ~1-2 hours |
| **Total** | **14 tasks** | **~5-8 hours** |

---

> **For Junior Programmers**: Read the `Where` first, then the `Problem`, then look at the `Fix`. Each task is small and independent — do them one at a time. Start from High → Low.
>
> **For Cheap AI Models**: Each task's `Fix` section is written as a direct instruction. The `Where` tells you exactly which files to change. Context is kept to a minimum so your token limit isn't wasted.
