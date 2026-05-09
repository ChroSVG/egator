# Egator Voting API

A secure and reliable REST API backend for election/voting systems built with Node.js, Express, and MongoDB.

## 🚀 Features

- **User Authentication** - JWT-based authentication with bcrypt password hashing
- **Election Management** - Create, read, update, and delete elections
- **Candidate Management** - Manage candidates for each election
- **Secure Voting** - Multiple layers of concurrency control to prevent double-voting
- **Image Upload** - Cloudinary integration for secure image storage
- **Rate Limiting** - Protection against brute force and API abuse
- **Input Validation** - Comprehensive validation using express-validator
- **Security Headers** - Helmet.js for enhanced HTTP security
- **Request Logging** - Morgan for HTTP request logging
- **Idempotency** - Prevents duplicate vote submissions

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB Atlas account or local MongoDB installation
- Cloudinary account (for image uploads)
- Redis (optional, for distributed locking in production)

## 🛠️ Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd server
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env` with your actual credentials:

```env
# Server
PORT = 5000
NODE_ENV = development

# MongoDB Atlas Connection
MONGO_URL = mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/voting-app?retryWrites=true&w=majority

# JWT Configuration
JWT_SECRET = <generate_strong_random_secret_min_32_chars>
JWT_EXPIRES_IN = 1d

# Cloudinary (Image Upload Service)
CLOUDINARY_CLOUD_NAME = <your_cloud_name>
CLOUDINARY_API_KEY = <your_api_key>
CLOUDINARY_API_SECRET = <your_api_secret>

# Redis (Optional - for distributed locking)
REDIS_URL = redis://localhost:6379

# Initial Admin Account
ADMIN_EMAIL = admin@example.com
ADMIN_PASSWORD = <strong_password_min_8_chars>
```

### 4. Generate a strong JWT secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Seed the initial admin user

```bash
npm run seed:admin
```

## 🏃 Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

The server will start on `http://localhost:5000` (or the port specified in `.env`).

### Health Check

```bash
curl http://localhost:5000/api/health
```

## 📚 API Documentation

### Base URL

```
http://localhost:5000/api
```

### Authentication Endpoints

#### Register New Voter

```http
POST /api/voters/register
Content-Type: application/json

{
    "fullName": "John Doe",
    "email": "john@example.com",
    "password": "Password@123",
    "password2": "Password@123"
}
```

#### Login

```http
POST /api/voters/login
Content-Type: application/json

{
    "email": "john@example.com",
    "password": "Password@123"
}
```

#### Get Voter Details

```http
GET /api/voters/:id
Authorization: Bearer <token>
```

### Election Endpoints

#### Create Election (Admin Only)

```http
POST /api/elections
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

title: Presidential Election 2024
description: Vote for the next president
thumbnail: <image_file>
```

#### Get All Elections

```http
GET /api/elections
Authorization: Bearer <token>
```

#### Get Single Election

```http
GET /api/elections/:id
Authorization: Bearer <token>
```

#### Update Election (Admin Only)

```http
PATCH /api/elections/:id
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

title: Updated Title
description: Updated Description
thumbnail: <image_file> (optional)
```

#### Delete Election (Admin Only)

```http
DELETE /api/elections/:id
Authorization: Bearer <admin_token>
```

#### Get Election Candidates

```http
GET /api/elections/:id/candidates
Authorization: Bearer <token>
```

#### Get Election Voters

```http
GET /api/elections/:id/voters
Authorization: Bearer <token>
```

#### Get Election Results

```http
GET /api/elections/:electionId/results
Authorization: Bearer <token>
```

### Candidate Endpoints

#### Create Candidate (Admin Only)

```http
POST /api/candidates
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

fullName: Jane Smith
motto: "A better future for all"
election: <election_id>
image: <image_file>
```

#### Get All Candidates

```http
GET /api/candidates?page=1&limit=10&election=<election_id>&search=john&sort=votes
Authorization: Bearer <token>
```

Query Parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `election`: Filter by election ID
- `search`: Search by candidate name
- `sort`: Sort by `votes` or `createdAt` (default)

#### Get Single Candidate

```http
GET /api/candidates/:id
Authorization: Bearer <token>
```

#### Vote for Candidate

```http
PATCH /api/candidates/:id/vote
Authorization: Bearer <token>
X-Idempotency-Key: <unique-uuid>
Content-Type: application/json

{
    "selectedElectionId": "<election_id>"
}
```

**Important:** Include a unique `X-Idempotency-Key` header (UUID format) to prevent duplicate votes.

#### Delete Candidate (Admin Only)

```http
DELETE /api/candidates/:id
Authorization: Bearer <admin_token>
```

## 🔒 Security Features

### Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Login | 5 attempts | 15 minutes |
| Registration | 3 attempts | 1 hour |
| Voting | 1 vote | 5 seconds |
| Admin Operations | 30 requests | 1 minute |
| General API | 100 requests | 15 minutes |

### Concurrency Control

The voting system uses multiple layers of protection against race conditions:

1. **Idempotency Middleware** - Prevents duplicate requests
2. **Request Queue** - Processes votes sequentially per election
3. **Database Transactions** - Ensures atomic updates
4. **Optimistic Locking** - Detects concurrent modifications
5. **Unique Constraints** - Database-level double-vote prevention

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

## 📁 Project Structure

```
server/
├── controllers/          # Request handlers
│   ├── candidateController.js
│   ├── electionController.js
│   └── voterController.js
├── middleware/           # Custom middleware
│   ├── authMiddleware.js
│   ├── errorMiddleware.js
│   ├── idempotencyMiddleware.js
│   ├── paginationMiddleware.js
│   ├── rateLimitMiddleware.js
│   ├── validationMiddleware.js
│   └── voteQueue.js
├── models/               # Mongoose schemas
│   ├── candidateModel.js
│   ├── electionModel.js
│   ├── errorModel.js
│   ├── idempotencyModel.js
│   ├── voterModel.js
│   └── voteRecordModel.js
├── routes/               # API routes
│   └── Routes.js
├── utils/                # Utility functions
│   ├── cloudinary.js
│   ├── seedAdmin.js
│   └── transactionHelper.js
├── tests/                # Test files
│   ├── setup.js
│   └── unit/
│       └── auth.test.js
├── uploads/              # Temporary file storage (gitignored)
├── .env                  # Environment variables (gitignored)
├── .env.example          # Environment template
├── index.js              # Application entry point
├── jest.config.js        # Jest configuration
└── package.json
```

## 🔧 Available Scripts

```bash
npm run dev          # Start with nodemon (development)
npm start            # Start server (production)
npm test             # Run tests
npm run test:watch   # Run tests in watch mode
npm run seed:admin   # Seed initial admin user
```

## 🚨 Error Handling

All errors return a consistent JSON format:

```json
{
    "success": false,
    "message": "Error message here",
    "statusCode": 400,
    "requestId": "uuid-here"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict (already voted) |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port | No (default: 5000) |
| `NODE_ENV` | Environment (development/production) | No |
| `MONGO_URL` | MongoDB connection string | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `JWT_EXPIRES_IN` | Token expiration time | No (default: 1d) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Yes |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Yes |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Yes |
| `REDIS_URL` | Redis connection URL | No |
| `ADMIN_EMAIL` | Initial admin email | No |
| `ADMIN_PASSWORD` | Initial admin password | No |

## 🛡️ Security Best Practices

1. **Never commit `.env`** - Contains sensitive credentials
2. **Rotate credentials regularly** - Especially after code commits
3. **Use HTTPS in production** - Never expose API over HTTP
4. **Enable CORS whitelist** - Don't use `*` in production
5. **Monitor rate limits** - Adjust based on traffic patterns
6. **Log security events** - Failed logins, admin actions, etc.

## 📄 License

ISC

## 👥 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🆘 Support

For issues and questions, please create an issue in the repository.
