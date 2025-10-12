# Workflows Dashboard

A Cloudflare-style workflow builder with drag-and-drop interface built with Next.js and React Flow.

## 🏗️ Project Structure

```
workflows-dashboard/
├── frontend/          # Next.js React application
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
├── backend/           # Express.js API server
│   ├── src/
│   ├── package.json
│   └── ...
└── README.md
```

## 🚀 Quick Start

### Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
Frontend will be available at http://localhost:3000

### Backend (Express.js)
```bash
cd backend
npm install
npm run dev
```
Backend API will be available at http://localhost:5000

## 🎯 Features

- **Cloudflare Dashboard Theme** - Authentic UI matching Cloudflare's design
- **Drag & Drop Workflow Builder** - Intuitive node-based workflow creation
- **Multiple Node Types** - Workers, D1, KV, APIs, Code blocks
- **Real-time Collaboration** - Live workflow editing
- **Export/Import** - Save and share workflows
- **RESTful API** - Backend API for workflow management

## 🛠️ Tech Stack

### Frontend
- Next.js 15 with App Router
- React Flow for workflow visualization
- Tailwind CSS for styling
- TypeScript for type safety
- Lucide React for icons

### Backend
- Express.js
- MongoDB with Mongoose
- JWT authentication
- CORS enabled
- Helmet for security

## 📦 Installation

1. Clone the repository
2. Install frontend dependencies:
   ```bash
   cd frontend && npm install
   ```
3. Install backend dependencies:
   ```bash
   cd backend && npm install
   ```
4. Copy environment files:
   ```bash
   cp backend/env.example backend/.env
   ```
5. Start both servers:
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend  
   cd frontend && npm run dev
   ```

## 🔧 Development

- Frontend runs on port 3000
- Backend runs on port 5000
- MongoDB connection required for full functionality
- Environment variables needed for Cloudflare API integration

## 📝 License

MIT License - see LICENSE file for details