-- Create workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  nodes TEXT NOT NULL,
  edges TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  status TEXT DEFAULT 'draft'
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workflows_updatedAt ON workflows(updatedAt DESC);
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_name ON workflows(name);

-- Insert sample workflow
INSERT OR IGNORE INTO workflows (
  id, 
  name, 
  description, 
  nodes, 
  edges, 
  createdAt, 
  updatedAt, 
  version, 
  status
) VALUES (
  'sample-workflow-1',
  'Sample Workflow',
  'A sample Cloudflare workflow for demonstration',
  '[]',
  '[]',
  datetime('now'),
  datetime('now'),
  1,
  'draft'
);
