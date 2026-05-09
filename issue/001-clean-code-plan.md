# Project Cleanup Plan

This plan is written to guide the cleanup of the Egator project. It uses 7 principles of clean programming. The language is simple so that junior programmers and AI models can easily understand and follow it.

## 7 Clean Programming Principles We Will Use

1. **DRY (Don't Repeat Yourself)**: Never write the same code twice.
2. **KISS (Keep It Simple, Stupid)**: Keep code simple and easy to read.
3. **SRP (Single Responsibility Principle)**: Each file or function should do only one thing.
4. **Separation of Concerns**: Keep the user interface (UI) separated from data logic (API calls).
5. **Readability**: Use good names and remove messy formatting (like lots of empty lines).
6. **YAGNI (You Aren't Gonna Need It)**: Remove code that is not used (like commented-out code).
7. **Centralized Logic**: Handle common tasks (like checking if a user is an admin or handling errors) in one place.

---

## What Needs to be Cleaned Up?

Based on reviewing the code in the project, here are the main things we need to fix:

### 1. Repeating Token Checks (DRY)
**Problem**: In `Result.jsx` and `ElectionDetails.jsx`, we check if a token exists inside a `useEffect`. If there is no token, we redirect to login. This is written in many files.
**Action**: Create a "Protected Route" component or a custom hook (like `useAuth`) to do this once. 

### 2. Repeating API Configurations (DRY)
**Problem**: Every time we call the API using `axios`, we add `withCredentials: true` and `headers: { Authorization: ... }`.
**Action**: Create a global Axios settings file (Axios Interceptor). This file will automatically add the token and credentials to all requests.

### 3. Dead Code and Logs (YAGNI / Readability)
**Problem**: There are many `console.log()` statements and commented-out code blocks (like `// import dummyElections`).
**Action**: Delete all `console.log()` that are not needed for errors. Delete all code that is commented out. 

### 4. Messy Formatting (Readability)
**Problem**: Files like `Result.jsx` have many blank lines.
**Action**: Clean up extra blank lines so the code looks neat.

### 5. Repeating Admin Checks on Server (DRY / SRP)
**Problem**: In server controllers (`candidateController.js`, `electionController.js`), there is code like `// if (!req.user.isAdmin)` which is commented out over and over again. 
**Action**: Remove these comments. Instead, create an `isAdmin` middleware. Apply this middleware in the `Routes.js` file, not inside the controller.

### 6. Fat Components (Separation of Concerns)
**Problem**: `ElectionDetails.jsx` handles fetching 3 different kinds of data (`getElectionsData`, `getCandidatesData`, `getVotersData`) directly in the component.
**Action**: Move API calls into a separate folder (for example, `client/src/services/api.js`). The component should only call simple functions like `api.getElection(id)`.

### 7. Repetitive Cache Invalidation (SRP)
**Problem**: In the backend, `cacheService.invalidateCandidate()` is repeated in almost every function.
**Action**: We can centralize this or just make sure it's kept as clean as possible inside the services layer rather than the controllers.

---

## Step-by-Step Action Plan

### Step 1: Clean Up Dead Code
- Open all pages and components in `client/src`.
- Remove all `console.log()` and commented-out code.
- Remove empty spaces.

### Step 2: Setup Axios Interceptor
- Create `client/src/api/axiosConfig.js`.
- Add base URL and Token header automatically.
- Update components to use this simple config.

### Step 3: Create Protected Routes
- Wrap pages in a `ProtectedRoute` component so we don't have to check `if (!token) navigate('/login')` in every file.

### Step 4: Clean Up Server Controllers
- Open `candidateController.js` and `electionController.js`.
- Remove all `// if (!req.user.isAdmin)` comments.
- Make sure controllers only handle the request and response, nothing else.

By following these simple steps, the project will be much cleaner, easier to read, and less redundant!
