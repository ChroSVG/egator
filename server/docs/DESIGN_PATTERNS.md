# Design Patterns Documentation

This document explains all the design patterns implemented in the Egator Voting API.

---

## 📚 Table of Contents

1. [Service Layer Pattern](#1-service-layer-pattern)
2. [Repository Pattern](#2-repository-pattern)
3. [Observer Pattern](#3-observer-pattern)
4. [Cache-Aside Pattern](#4-cache-aside-pattern)
5. [Circuit Breaker Pattern](#5-circuit-breaker-pattern)
6. [Command Pattern](#6-command-pattern)
7. [Unit of Work Pattern](#7-unit-of-work-pattern)
8. [Middleware Pattern](#8-middleware-pattern)
9. [Factory Pattern](#9-factory-pattern)
10. [Strategy Pattern](#10-strategy-pattern)

---

## 1. Service Layer Pattern

**Purpose:** Separate business logic from controllers (presentation layer).

### Implementation

**Location:** `services/`

```
services/
├── authService.js
├── votingService.js
├── candidateService.js
└── electionService.js
```

### Benefits
- ✅ Separation of concerns
- ✅ Easier testing (mock services)
- ✅ Reusable business logic
- ✅ Controllers stay thin

### Example

```javascript
// services/votingService.js
class VotingService {
    async castVote(voterId, candidateId, electionId) {
        // Business logic here
        await this.voteRecordRepository.recordVote({...});
        await this.candidateRepository.incrementVoteCount(candidateId);
    }
}

// controllers/candidateController.js
const votingService = new VotingService();
const voteForCandidate = async (req, res) => {
    const result = await votingService.castVote(...);
    res.json(result);
};
```

---

## 2. Repository Pattern

**Purpose:** Abstract data access logic, decouple domain objects from database.

### Implementation

**Location:** `repositories/`

```
repositories/
├── baseRepository.js      # Generic CRUD operations
├── candidateRepository.js # Candidate-specific queries
├── electionRepository.js  # Election-specific queries
├── voterRepository.js     # Voter-specific queries
└── voteRecordRepository.js # Vote tracking
```

### Benefits
- ✅ Single source of truth for data access
- ✅ Easy to swap database implementations
- ✅ Centralized query logic
- ✅ Better testability with mocks

### Example

```javascript
// repositories/baseRepository.js
class BaseRepository {
    async findById(id, options = {}) { ... }
    async findAll(filter = {}, options = {}) { ... }
    async create(data) { ... }
    async updateById(id, update) { ... }
    async deleteById(id) { ... }
}

// repositories/candidateRepository.js
class CandidateRepository extends BaseRepository {
    async findByElection(electionId) { ... }
    async incrementVoteCount(id, amount) { ... }
    async getVoteStatistics(electionId) { ... }
}
```

---

## 3. Observer Pattern

**Purpose:** Allow objects to subscribe to events and be notified when they occur.

### Implementation

**Location:** `utils/eventEmitter.js`, `subscribers/`

### Benefits
- ✅ Loose coupling between components
- ✅ Easy to add new event handlers
- ✅ Supports event-driven architecture
- ✅ Audit logging, notifications, analytics

### Example

```javascript
// utils/eventEmitter.js
class AppEventEmitter extends EventEmitter {
    emitVoteCast(data) {
        this.emit('vote:cast', { type: 'vote:cast', ...data });
    }
}

// subscribers/loggingSubscriber.js
eventEmitter.subscribe('vote:cast', (data) => {
    console.log('🗳️  VOTE CAST:', data);
});

// services/votingService.js
eventEmitter.emitVoteCast({ voterId, candidateId, electionId });
```

### Events

| Event | Payload |
|-------|---------|
| `vote:cast` | voterId, candidateId, electionId |
| `vote:undone` | voterId, candidateId, electionId |
| `election:created` | electionId, title, adminId |
| `election:deleted` | electionId, title |
| `candidate:created` | candidateId, name, electionId |
| `user:registered` | userId, email |
| `user:login` | userId, email |
| `error` | message, stack, context |

---

## 4. Cache-Aside Pattern

**Purpose:** Improve performance by caching frequently accessed data.

### Implementation

**Location:** `utils/cacheService.js`

### How It Works

```
1. Application requests data
2. Check cache first
3. If cache HIT → return cached data
4. If cache MISS → fetch from DB, store in cache, return data
5. On update → invalidate cache
```

### Benefits
- ✅ Reduced database load
- ✅ Faster response times
- ✅ Automatic fallback to memory cache
- ✅ Redis support for production

### Example

```javascript
// controllers/electionController.js
const result = await cacheService.getOrSet(
    `election:${id}:results`,
    async () => {
        return await electionService.getElectionResults(id);
    },
    60 // 1 minute TTL
);
```

### Cache Keys

```
elections:{isActive}:{page}:{limit}
election:{id}:{includeCandidates}
election:{id}:results
candidates:{election}:{search}:{sort}:{page}:{limit}
candidate:{id}
```

---

## 5. Circuit Breaker Pattern

**Purpose:** Prevent cascading failures when external services fail.

### Implementation

**Location:** `utils/circuitBreaker.js`

### States

```
CLOSED → Normal operation, requests pass through
   ↓ (failures >= threshold)
OPEN → Circuit tripped, requests fail immediately
   ↓ (timeout expires)
HALF-OPEN → Testing recovery, limited requests
   ↓ (success)        ↓ (failure)
CLOSED              OPEN
```

### Benefits
- ✅ Prevents cascading failures
- ✅ Graceful degradation
- ✅ Automatic recovery
- ✅ Statistics and monitoring

### Example

```javascript
// utils/circuitBreaker.js
const cloudinaryBreaker = registry.get('cloudinary', {
    failureThreshold: 3,
    timeout: 10000
});

// services/candidateService.js
const imageUrl = await cloudinaryBreaker.execute(
    async () => await cloudinary.uploader.upload(...),
    { fallback: 'default-image-url' }
);
```

### Endpoints

```
GET /api/health              # Includes circuit breaker status
GET /api/admin/circuit-breakers  # Detailed status
```

---

## 6. Command Pattern

**Purpose:** Encapsulate operations as objects for better control and audit.

### Implementation

**Location:** `commands/voteCommand.js`

### Benefits
- ✅ Encapsulates complex logic
- ✅ Supports undo/redo
- ✅ Command queuing
- ✅ Audit trail
- ✅ Validation before execution

### Example

```javascript
// commands/voteCommand.js
class VoteCommand {
    async execute() {
        // Validate
        const validation = await this.validate();
        if (!validation.valid) throw new Error(validation.errors);
        
        // Execute
        return await this.votingService.castVote(...);
    }
    
    async undo() {
        // Reverse the operation
        await this.voteRecordRepository.deleteVote(...);
    }
}

// controllers/candidateController.js
const voteCommand = new VoteCommand(voterId, candidateId, electionId);
const result = await voteCommand.execute();
```

### Command Handler

```javascript
const handler = new CommandHandler();
await handler.executeCommand(voteCommand);
handler.getHistory(10); // Get last 10 commands
```

---

## 7. Unit of Work Pattern

**Purpose:** Track and coordinate changes across multiple operations.

### Implementation

**Location:** `utils/transactionHelper.js`, used in services

### Benefits
- ✅ Atomic operations (all or nothing)
- ✅ Data consistency
- ✅ Automatic retry on transient errors
- ✅ Resource cleanup

### Example

```javascript
// utils/transactionHelper.js
const withTransaction = async (operation, options = {}) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const result = await operation(session);
        await session.commitTransaction();
        return result;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    }
};

// services/votingService.js
await withTransaction(async (session) => {
    await this.voteRecordRepository.recordVote(data, session);
    await this.voterRepository.recordVote(voterId, electionId, session);
    await this.candidateRepository.incrementVoteCount(candidateId, 1, session);
});
```

---

## 8. Middleware Pattern

**Purpose:** Process requests through a pipeline of handlers.

### Implementation

**Location:** `middleware/`

```
middleware/
├── authMiddleware.js           # Authentication
├── validationMiddleware.js     # Input validation
├── rateLimitMiddleware.js      # Rate limiting
├── idempotencyMiddleware.js    # Duplicate prevention
├── paginationMiddleware.js     # Pagination
├── voteQueue.js                # Vote queuing
└── errorMiddleware.js          # Error handling
```

### Benefits
- ✅ Reusable request processing
- ✅ Separation of concerns
- ✅ Chain of responsibility
- ✅ Easy to add/remove processing steps

### Example

```javascript
// routes/Routes.js
router.patch('/candidates/:id/vote',
    authMiddleware,           // 1. Authenticate
    voteLimiter,              // 2. Rate limit
    idempotencyGuard,         // 3. Check duplicates
    validateVote,             // 4. Validate input
    voteForCandidate          // 5. Handle request
);
```

---

## 9. Factory Pattern

**Purpose:** Centralize object creation.

### Implementation

**Location:** `models/` (Mongoose models)

### Benefits
- ✅ Centralized creation logic
- ✅ Consistent object structure
- ✅ Easy to add validation

### Example

```javascript
// models/candidateModel.js
const candidateSchema = new Schema({...});
module.exports = model('Candidate', candidateSchema);

// Usage
const candidate = new CandidateModel({...});
await candidate.save();
```

---

## 10. Strategy Pattern

**Purpose:** Define interchangeable algorithms.

### Implementation

**Location:** Error handling, cache strategies

### Benefits
- ✅ Easy to swap implementations
- ✅ Open/closed principle
- ✅ Runtime algorithm selection

### Example

```javascript
// Error status code selection
const statusCode = error.message.includes("already") ? 409 :
                   error.message.includes("not found") ? 404 : 400;

// Cache strategy (Redis vs Memory)
if (this.useRedis && this.redis) {
    // Redis strategy
} else {
    // Memory strategy
}
```

---

## 📊 Pattern Summary

| Pattern | Location | Complexity | Impact |
|---------|----------|------------|--------|
| Service Layer | `services/` | Low | High |
| Repository | `repositories/` | Medium | High |
| Observer | `utils/eventEmitter.js` | Low | Medium |
| Cache-Aside | `utils/cacheService.js` | Medium | High |
| Circuit Breaker | `utils/circuitBreaker.js` | High | Medium |
| Command | `commands/` | Medium | Medium |
| Unit of Work | `utils/transactionHelper.js` | Medium | High |
| Middleware | `middleware/` | Low | High |
| Factory | `models/` | Low | Medium |
| Strategy | Various | Low | Medium |

---

## 🎯 When to Use Each Pattern

| Problem | Pattern |
|---------|---------|
| Business logic in controllers | Service Layer |
| Direct database calls in controllers | Repository |
| Need event notifications | Observer |
| Slow database queries | Cache-Aside |
| External service failures | Circuit Breaker |
| Complex operations with undo | Command |
| Multiple database operations | Unit of Work |
| Cross-cutting concerns | Middleware |

---

## 📈 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      HTTP Request                        │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│              Middleware Pipeline                         │
│  (CORS → Helmet → Auth → RateLimit → Validation)        │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    Controllers                           │
│         (Thin - delegate to services)                    │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                 Services Layer                           │
│  (Business Logic, Transactions, Events)                 │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                Repositories                              │
│         (Data Access Abstraction)                        │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                   MongoDB                                │
└─────────────────────────────────────────────────────────┘

Side Components:
- Cache Service (Redis/Memory)
- Circuit Breaker (Fault Tolerance)
- Event Emitter (Observers)
- Command Handler (Audit Trail)
```

---

**Last Updated:** March 19, 2026
