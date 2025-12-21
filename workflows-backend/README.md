# Workflows Backend

A modern backend API for workers++ built with Hono and Cloudflare Workers.

## Features

- **Hono Framework**: Fast, lightweight web framework for Cloudflare Workers
- **TypeScript**: Full type safety throughout the application
- **D1 Database**: SQLite database for persistent storage
- **KV Storage**: Fast key-value storage for caching
- **Workflow Management**: CRUD operations for workflows
- **Node Registry**: Built-in node types and definitions
- **Code Generation**: Generate Cloudflare Workers code from workflows
- **Validation**: Comprehensive workflow validation
- **CORS Support**: Cross-origin resource sharing enabled

## API Endpoints

### Health Check
- `GET /health` - Health check endpoint

### Workflows
- `GET /api/workflows` - Get all workflows
- `GET /api/workflows/:id` - Get workflow by ID
- `POST /api/workflows` - Create new workflow
- `PUT /api/workflows/:id` - Update workflow
- `DELETE /api/workflows/:id` - Delete workflow
- `POST /api/workflows/validate` - Validate workflow
- `POST /api/workflows/generate-code` - Generate worker code

### Nodes
- `GET /api/nodes` - Get all available node types
- `GET /api/nodes/:name` - Get specific node definition
- `GET /api/nodes/categories` - Get all node categories
- `GET /api/nodes/category/:category` - Get nodes by category

## Development

### Prerequisites
- Node.js 18+
- Wrangler CLI
- Cloudflare account

### Setup

1. Install dependencies:
```bash
npm install
```

2. Configure your environment:
```bash
cp .env.example .env
# Edit .env with your values
```

3. Update `wrangler.jsonc` with your bindings:
```json
{
  "kv_namespaces": [
    {
      "binding": "WORKFLOWS_KV",
      "id": "your-kv-namespace-id"
    }
  ],
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "workflows-db",
      "database_id": "your-d1-database-id"
    }
  ]
}
```

4. Run database migrations:
```bash
wrangler d1 migrations apply workflows-db
```

5. Start development server:
```bash
npm run dev
```

### Deployment

```bash
npm run deploy
```

## Project Structure

```
src/
├── controllers/     # Request handlers
├── middleware/     # Middleware functions
├── routes/         # Route definitions
├── services/       # Business logic
├── types/          # TypeScript types
├── utils/          # Utility functions
├── db/             # Database migrations
└── index.ts        # Main application entry
```

## Database Schema

### Workflows Table
- `id` (TEXT, PRIMARY KEY)
- `name` (TEXT, NOT NULL)
- `description` (TEXT)
- `nodes` (TEXT, JSON)
- `edges` (TEXT, JSON)
- `createdAt` (TEXT)
- `updatedAt` (TEXT)
- `version` (INTEGER)
- `status` (TEXT)

## License

MIT
