# workflows dashboard

build deploy and manage cloudflare workflows with a visual drag-and-drop interface.


### workflow builder

- drag-and-drop visual editor with react flow
- real-time validation and error detection
- insert nodes between edges dynamically
- live code preview of generated workers code
- template expressions for node-to-node data flow
- graph analysis with topological sorting
- local workflow persistence

### ai workflow generation

- generate workflows from text descriptions
- generate workflows from uploaded images
- paste images directly into the generator
- ai detects missing fields and prompts for completion
- automatic node and edge structure generation

### workflow compilation

- compile visual workflows to typescript workers code
- automatic binding detection for cloudflare resources
- template resolution with node state references
- reverse codegen to import existing workflow code
- compilation preview before deployment
- binding validation against available resources

### deployment system

- one-click deployment to cloudflare workers
- real-time progress tracking with server-sent events
- animated deployment pipeline visualization
- durable objects for reliable deployment state
- automatic worker creation and versioning
- mcp protocol support for ai workflows
- deployment timeline with detailed progress

### workflow management

- browse deployed workflows with pagination
- monitor workflow instances in real-time
- log tailing with session management
- instance execution details and status tracking

### cloudflare resources

- d1 database management with sql query execution
- r2 bucket management and object browsing
- kv namespace management with key listing
- worker version history and inspection
- query validation and schema inspection

### workflow starters

- pre-configured templates by difficulty level
- tagged templates for discovery
- one-click starter loading
- sample workflows for common patterns

### node system

- comprehensive catalog with categories
- json schema validation for node configs
- node execution testing before deployment
- template expressions with double curly braces
- nested template resolution in complex objects

### developer experience

- typescript throughout
- effect library for functional error handling
- zod schema validation
- hono framework on cloudflare workers
- next.js with app router
- react query for data fetching
- zustand for state management

## technical stack

backend: hono on cloudflare workers with d1 kv and durable objects. effect library for functional programming. graph algorithms for workflow validation. code generation engine with template resolution.

frontend: next.js 14+ with react flow visualization. tailwind css styling. react query for server state. zustand for client state. framer motion animations.

## moaaarrr capabilities

- visual drag-and-drop workflow builder
- ai generation from text or images
- real-time deployment streaming
- template system for node data flow
- reverse codegen from existing code
- automatic binding detection
- graph-based workflow validation
- durable objects for deployment state
- mcp protocol integration
- comprehensive cloudflare resource management
