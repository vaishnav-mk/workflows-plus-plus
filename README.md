# workflows ++

build deploy and manage cloudflare workflows with a visual drag-and-drop interface.

<img width="1873" height="954" alt="image" src="https://github.com/user-attachments/assets/592f1870-a46f-4c54-b173-d7b5b4e9aecf" />
<img width="1876" height="897" alt="image" src="https://github.com/user-attachments/assets/0d63839b-63b7-4640-99fb-5be26687ad42" />
<img width="1880" height="964" alt="image" src="https://github.com/user-attachments/assets/284edd12-8bd2-4c28-aa56-a4b216970384" />
<img width="1879" height="959" alt="image" src="https://github.com/user-attachments/assets/e7c00b3a-8cca-4105-89d9-946974ee6e58" />
<img width="1876" height="963" alt="image" src="https://github.com/user-attachments/assets/29b9880b-fc1a-433d-baa0-db41503aeea6" />


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

### nerdy stuff

- typescript throughout
- effect for functional error handling
- zod schema validation
- hono framework on cloudflare workers
- next.js with app router
- react query for data fetching
- zustand for state management

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
