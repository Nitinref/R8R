R8R - Rapid RAG Runtime 🚀
https://img.shields.io/badge/License-MIT-yellow.svg
https://img.shields.io/badge/TypeScript-Ready-blue.svg
https://img.shields.io/badge/RAG-Enabled-green.svg

Revolutionizing RAG Development
R8R is an enterprise-grade RAG Workflow-as-a-Service platform that transforms complex multi-LLM retrieval pipelines into simple API calls. Stop building RAG systems from scratch - deploy sophisticated retrieval workflows in minutes, not weeks.

🎯 What is R8R?
R8R (Rapid RAG Runtime) provides pre-built, optimized RAG workflows accessible via REST API. We handle the complexity of query rewriting, multiple retrieval strategies, and LLM orchestration so you can focus on building amazing AI applications.

🖼️ Platform Preview
<div align="center">
Landing Page - Modern & Engaging
<img src="./assets/2.png" alt="R8R Landing Page" width="600" style="border-radius: 8px; border: 1px solid #333; margin-bottom: 10px;" /> <p><em>Clean, professional landing page showcasing R8R's value proposition and features</em></p>
Signup & Authentication
<img src="./assets/3.png" alt="R8R Signup" width="600" style="border-radius: 8px; border: 1px solid #333; margin-bottom: 10px;" /> <p><em>Streamlined signup process with secure authentication and API key generation</em></p>
Visual Workflow Editor
<img src="./assets/1.png" alt="R8R Workflow Editor" width="600" style="border-radius: 8px; border: 1px solid #333; margin-bottom: 10px;" /> <p><em>Intuitive drag-and-drop workflow editor with node-based pipeline creation</em></p></div>
🎯 The Problem We Solve
🕒 Building production RAG systems takes 4-8 weeks

🔧 Managing multiple LLMs and vector databases is complex

⚙️ Query rewriting, hybrid search, and result synthesis require extensive tuning

🔄 Most teams reinvent the wheel for every project

💡 Our Solution
🚀 API-first RAG workflows - Deploy in 5 minutes

🧠 Multi-LLM intelligence - Smart routing and fallbacks

🔍 Built-in query optimization - Automatic query rewriting

📊 Multiple retrieval strategies - Vector, hybrid, multi-hop in parallel

🏢 Enterprise ready - Rate limiting, monitoring, security

⚡ Quick Start
1. Get Your API Key
bash
# Sign up at https://r8r.ai
# Get your free API key (1000 queries/month)
2. Make Your First Call
javascript
import R8R from 'r8r-client';

const client = new R8R('your-api-key');

const result = await client.query(
  "What are the latest treatments for type 2 diabetes?",
  {
    pipeline: 'advanced',
    sources: ['medical_journals', 'clinical_guidelines']
  }
);

console.log(result.answer);
3. Or Use REST API
bash
curl -X POST https://api.r8r.ai/v1/query \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Explain quantum computing applications in healthcare",
    "pipeline": "research",
    "format": "detailed"
  }'
🏗️ Architecture
text
Input Query
    ↓
Smart Query Rewriter (Multi-LLM)
    ↓
Parallel RAG Pipelines
├── Vector Search (Dense Embeddings)
├── Hybrid Search (Vector + Keyword)
├── Multi-Hop Reasoning
└── Cross-Modal Retrieval
    ↓
Intelligent Result Synthesis
    ↓
Verified, Source-Cited Response
🔧 Core Features
🧠 Smart Query Rewriting
✅ 5+ rewriting strategies per query

✅ Multi-LLM ensemble (GPT-4, Claude-3, Llama-3)

✅ Automatic intent recognition

✅ Domain-specific optimization

🔍 Multi-Pipeline Retrieval
✅ Vector RAG - Semantic similarity search

✅ Hybrid RAG - Best of vector + keyword search

✅ Multi-Hop RAG - Complex reasoning chains

✅ Cross-Modal RAG - Text + structured data

🎯 Pre-Built Workflows
javascript
// Available pipeline types:
'standard'      // Fast, general-purpose
'advanced'      // Multi-strategy with verification  
'research'      // Academic/scientific rigor
'enterprise'    // Maximum accuracy, multiple validations
'custom'        // Tailored to your domain
📊 Built-in Analytics
📈 Query performance metrics

🎯 Source attribution scoring

📊 Pipeline effectiveness analysis

💰 Cost optimization insights

📚 API Reference
Query Endpoint
javascript
POST /v1/query

{
  "query": "Your question here",
  "pipeline": "standard|advanced|research|enterprise",
  "llm_preferences": ["gpt-4", "claude-3", "llama-3"],
  "response_format": "concise|detailed|analysis",
  "domain_context": {"industry": "healthcare", "rigor": "high"},
  "max_sources": 10,
  "citation_style": "apa|ieee|simple"
}
Response Format
javascript
{
  "success": true,
  "data": {
    "answer": "Comprehensive, sourced answer...",
    "sources": [
      {
        "title": "Source document",
        "url": "https://example.com",
        "confidence": 0.95,
        "relevance_score": 0.88
      }
    ],
    "metadata": {
      "processing_time": 2.3,
      "pipelines_used": ["vector", "hybrid", "multi_hop"],
      "query_rewrites": [
        {
          "original": "diabetes treatments",
          "rewritten": "latest clinical guidelines for type 2 diabetes mellitus treatments 2024",
          "strategy": "semantic_expansion"
        }
      ],
      "confidence_score": 0.94
    }
  }
}
💰 Pricing
Plan	Queries/Month	Features	Price
Free Tier	1,000	Standard pipeline, Basic analytics, Community support	$0
Pro	50,000	All advanced pipelines, Custom domain tuning, Priority support, Advanced analytics	$49/month
Enterprise	Unlimited	Dedicated instances, White-label options, SLAs & custom workflows, On-premise deployment	Custom
🛠️ Integration Examples
Next.js Application
javascript
// pages/api/chat.js
import R8R from 'r8r-client';

export default async function handler(req, res) {
  const client = new R8R(process.env.R8R_API_KEY);
  
  const result = await client.query(req.body.message, {
    pipeline: 'advanced',
    domain_context: { industry: 'healthcare' }
  });
  
  res.json(result);
}
React Component
javascript
import { useR8R } from 'r8r-react';

function ChatApp() {
  const { query, loading, error } = useR8R('your-api-key');
  
  const handleQuestion = async (question) => {
    const result = await query(question, {
      pipeline: 'advanced',
      response_format: 'detailed'
    });
    console.log(result);
  };
  
  return <ChatInterface onSendMessage={handleQuestion} />;
}
Python Integration
python
from r8r_client import R8RClient

client = R8RClient(api_key="your-api-key")
response = client.query(
    "What's the capital of France?",
    pipeline="standard"
)
print(response['answer'])
🔒 Security & Compliance
✅ SOC 2 Type II Certified

✅ GDPR & CCPA Compliant

✅ End-to-end encryption

✅ Data isolation per customer

✅ Zero data retention (optional)

✅ On-premise deployment available

📈 Why Choose R8R?
👨‍💻 For Developers
⚡ 90% faster RAG implementation

🛠️ No infrastructure management

🎯 Consistent, high-quality results

📈 Scalable from prototype to production

🏢 For Enterprises
✅ Proven accuracy across domains

💰 Cost control with predictable pricing

🔒 Security & compliance built-in

📞 Enterprise support with SLAs

🧠 For AI Teams
💡 Focus on innovation, not infrastructure

🔄 A/B test pipelines easily

📊 Comprehensive analytics for optimization

🚀 Continuous pipeline improvements

🚀 Getting Started
1. Sign Up
Visit r8r.ai for free API key

2. Integrate
bash
npm install r8r-client
# or
pip install r8r-client
3. Deploy
javascript
// That's it! You're ready to use production-grade RAG
const answer = await r8r.query("Your question here");
🆘 Support
📚 Documentation: docs.r8r.ai

💬 Community: Discord

📧 Email: support@r8r.ai

📊 Status: status.r8r.ai

© 2024 FlowForge AI. All rights reserved.

"Stop building RAG infrastructure. Start building AI applications." 🚀
