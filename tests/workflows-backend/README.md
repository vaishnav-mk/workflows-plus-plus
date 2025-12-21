# Workflows Backend Tests

Comprehensive test suite for the workflows-backend API using Vitest and Cloudflare Workers testing framework.

## Setup

1. **Start the backend API first:**
```bash
cd workflows-backend
npm run dev
```
The API should be running at `http://localhost:8787`

2. **Install test dependencies:**
```bash
cd tests/workflows-backend
npm install
```

3. The tests use the following Cloudflare credentials (set as environment variables in the backend):
   - API Token: `y8WYQMwuNQ-2nDDQYsxPeB6Q5hzR601I7zPpXYDC`
   - Account ID: `c714a393dbfabeb858a7dea729b5e8f8`
   
   Make sure these are set in `workflows-backend/.dev.vars` or as environment variables.

## Running Tests

### Run all tests:
```bash
npm test
```

### Run tests in watch mode:
```bash
npm run test:watch
```

### Run tests with UI:
```bash
npm run test:ui
```

## Test Structure

Tests are organized by route in the `routes/` directory:

- `setup.routes.test.ts` - Authentication and setup endpoints
- `catalog.routes.test.ts` - Node catalog endpoints
- `compiler.routes.test.ts` - Workflow compilation endpoints
- `workflow.routes.test.ts` - Workflow management endpoints
- `starters.routes.test.ts` - Workflow starter templates
- `worker.routes.test.ts` - Worker management endpoints
- `version.routes.test.ts` - Worker version endpoints
- `node-execution.routes.test.ts` - Node execution and validation
- `ai.routes.test.ts` - AI workflow generation
- `instance.routes.test.ts` - Workflow instance management
- `deployment.routes.test.ts` - Deployment progress streaming
- `d1.routes.test.ts` - D1 database operations
- `r2.routes.test.ts` - R2 bucket operations
- `kv.routes.test.ts` - KV namespace operations

## Test Coverage

Each route test file includes:
- ✅ Successful request scenarios
- ❌ Authentication failure scenarios
- ❌ Validation error scenarios
- ❌ Missing required fields scenarios
- ❌ Invalid parameter scenarios

## Authentication

Tests use encrypted credentials stored in cookies. The test helpers automatically:
1. Create encrypted credentials using the master key from environment
2. Set the `cf_credentials` cookie for authenticated requests
3. Use the actual Cloudflare API token and account ID for API calls

## Mocking

The tests use `fetchMock` to mock Cloudflare API responses. Each test that makes external API calls should:
1. Set up mocks in `beforeAll`
2. Clean up mocks in `afterEach`
3. Use `fetchMock.assertNoPendingInterceptors()` to ensure all mocks were used

## Configuration

The test configuration is in `vitest.config.ts`:
- Uses standard Vitest (not Workers runtime)
- Tests against the real API running at `http://localhost:8787`
- Can be configured via `API_BASE_URL` environment variable

## Notes

- **Tests run against the actual running API** - make sure the backend is running!
- Tests make real HTTP requests to `http://localhost:8787`
- Tests use actual Cloudflare credentials (set in backend environment)
- Authentication works via cookies or env var fallback in credentials middleware
- Tests will make real requests to Cloudflare API (not mocked)

## Important

⚠️ **Before running tests, ensure:**
1. The backend is running: `cd workflows-backend && npm run dev`
2. The backend has the correct credentials in `.dev.vars` or environment
3. You have a valid Cloudflare API token with appropriate permissions

## Environment Variables

You can override the API URL:
```bash
API_BASE_URL=http://localhost:8787 npm test
```

