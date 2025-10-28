const response = await fetch('http://localhost:3001/api/query', {
  method: 'POST',
  headers: {
    'x-api-key': 'rag_749f36992a8f4db4975dfc3da608c459',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    workflowId: 'workflow-1761557706497',
    query: 'is the participating in the hackathon is mandatory?',
  })
});

const result = await response.json();
console.log('Answer:', result.answer);
console.log('Sources:', result.sources.length);
console.log('Latency:', result.latency, 'ms');