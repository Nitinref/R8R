const response = await fetch('http://localhost:3001/api/query', {
  method: 'POST',
  headers: {
    'x-api-key': 'rag_3e61ccdd421f445280bc9ca40d0a1f79',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    workflowId: 'workflow-1761845693139',
    query: 'What is the objective measure of a "good" or "meaningful" life?'
  })
});

const result = await response.json();
console.log('Answer:', result.answer);
console.log('Sources:', result.sources.length);
console.log('Latency:', result.latency, 'ms');