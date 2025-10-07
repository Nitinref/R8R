R8R (R-8-R)

R8R is a multi-LLM, multi-retrieval workflow orchestration platform that enables users to visually build and deploy custom RAG (Retrieval-Augmented Generation) pipelines. Users can drag & drop workflow steps (query rewriting, retrieval, reranking, answer generation), customize prompts and fallback logic, and invoke pipelines via API keys.

🚀 Features

Visual Workflow Builder: Drag-and-drop interface (or form/JSON mode) to design RAG pipelines

Multi-LLM Orchestration: Configure which LLM to use per step (rewriter, reranker, answer generator) with fallback options

Multi-Retriever Support: Combine vector search, keyword search, hybrid strategies

Prompt Customization: Each step can have a custom prompt template

Multi-Tenant API: Users get their own API keys & workflows

Rate Limiting & Throttling: Built-in support via express-rate-limit + Redis store

Caching & Performance: Use Redis to cache intermediate results

Analytics & Logging: Track history, latency, hallucination rates, accuracy

Auto-Optimization (future): Monitor model performance and dynamically switch models

🏗 Architecture Overview
Frontend (Next.js + React)
   └── Workflow Builder (Drag & Drop / Form / JSON)
   └── Dashboard: API keys, logs, analytics

Backend (Node.js / Express or equivalent)
   ├── API endpoints: /register, /login, /workflows, /query
   ├── Orchestration Engine: executes workflow steps
   ├── LLM Router & Fallback Logic
   ├── Retriever Manager: vector DB, keyword search, hybrid
   ├── Rate Limiter Middleware (Redis-based)
   └── Logging & Analytics Module

Database (PostgreSQL / MongoDB)
   ├── Users & API Keys
   ├── Workflow configurations (JSON/YAML)
   └── Query logs, metrics

Cache & Store (Redis)
   ├── Rate limiter store
   ├── Caching intermediate results
   └── Enable performance and throughput

External Integrations
   ├── OpenAI / Other LLM APIs
   ├── Vector DBs: Pinecone, Milvus, Weaviate
   └── Keyword search module or external index

📦 Installation & Setup

Below instructions assume a Unix-like environment. Adjust accordingly for Windows or Docker.

Clone the repo

git clone https://github.com/your-org/R8R.git
cd R8R


Backend Setup

cd backend
npm install


Configure environment variables in .env:

PORT=3001
REDIS_URL=redis://localhost:6379
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
JWT_SECRET=your_jwt_secret
DB_URL=postgresql://user:pass@localhost:5432/r8r
OPENAI_API_KEY=your_openai_key


Frontend Setup

cd ../frontend
npm install


In .env.local:

NEXT_PUBLIC_API_URL=http://localhost:3001


Run Redis

If you have Redis installed:

redis-server


Or use Docker:

docker run -d --name redis -p 6379:6379 redis


Start Services

In backend directory:

npm run dev


In frontend directory:

npm run dev


Access Dashboard

Open browser and navigate to http://localhost:3000 (or your configured port).

🛠 Usage
Register & Login

Register a new account via frontend or /register endpoint

Login to receive a JWT or session

Create a Workflow

Use the drag-and-drop builder or form to define a pipeline

Or paste JSON / YAML definition

Save — you’ll receive a workflow_id

Query via API
POST /query
Authorization: Bearer <your_api_key>

{
  "workflow_id": "my_workflow_v1",
  "query": "Explain how blockchain consensus works"
}


Response:

{
  "answer": "...",
  "sources": [...],
  "confidence": 0.89
}

🧪 Example Workflow JSON / YAML
workflow_id: "research_assistant_v1"
steps:
  - step: query_rewrite
    llm: gemini-1.5
    prompt: "Rephrase the user’s question to make it specific for retrieval."
  - step: retrieval
    retrievers:
      - pinecone
      - keyword_search
  - step: rerank
    llm: openai-gpt-4
  - step: answer_generation
    llm: claude-3
    prompt: "Use the documents to craft a concise, evidence-based answer."

🔐 Rate Limiting & Safety

The system uses express-rate-limit with a Redis-backed store

IPv6-safe key generation via ipKeyGenerator ensures limits apply correctly

Two limiters:

apiLimiter — for general API endpoints

queryLimiter — for /query endpoint

If Redis is unreachable, consider fallback to in-memory store (for development only)

📈 Analytics & Logging

Every query and sub-step is logged with timestamps

Track:

Latency per LLM call

Hallucination or error rate

Model fallback usage

Dashboard visualizes metrics by workflow and user

🚧 Future Enhancements

Auto-Optimization Module: dynamically switch models or retrievers based on performance

Plugin System: allow custom node types (e.g., summarization, classification)

Team & Collaboration Features: share workflows among team members

Access Controls & Policies: roles, quotas, permissions

Versioning Workflows: maintain different versions of workflow logic

Multi-model Ensembling: combine outputs from multiple LLMs for more robust answers

🧑‍💻 Contributing

Fork the repository

Create a feature branch: git checkout -b feat/my-feature

Make your changes & add tests

Submit a PR describing your changes

We follow conventional commits and require code review + tests before merging.
