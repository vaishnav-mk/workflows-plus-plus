# Workflows Backend Tests

Comprehensive test suite for the workflows-backend API using Vitest and Cloudflare Workers testing framework.

## Setup

1. Install dependencies:
```bash
cd tests/workflows-backend
npm install
```

2. The tests use the following Cloudflare credentials (configured in `vitest.config.ts`):
   - API Token: `y8WYQMwuNQ-2nDDQYsxPeB6Q5hzR601I7zPpXYDC`
   - Account ID: `c714a393dbfabeb858a7dea729b5e8f8`

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
- Uses `@cloudflare/vitest-pool-workers` for Workers runtime testing
- Configures KV, D1, and Durable Objects bindings
- Sets environment variables including credentials and master key

## Notes

- Tests run in the Cloudflare Workers runtime using Miniflare
- All storage operations are isolated per test
- Tests use the actual Cloudflare credentials provided
- Authentication cookies are encrypted using the same mechanism as production

## Known Issues

There is currently a compatibility issue with `@cloudflare/vitest-pool-workers@0.9.0` that causes the error:
```
TypeError: vm._setUnsafeEval is not a function
```

This appears to be a bug in the package itself. Potential workarounds:
1. Wait for an updated version of `@cloudflare/vitest-pool-workers`
2. Use a different testing approach (e.g., using `unstable_startWorker()` API)
3. Test individual functions in isolation without the Workers runtime

The test structure is complete and ready to run once this issue is resolved.

