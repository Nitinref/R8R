const response = await fetch('http://localhost:3001/api/query', {
  method: 'POST',
  headers: {
    'x-api-key': 'rag_f6ef23f786b840879906938eacaef7d1',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    workflowId: 'workflow-1762781172466',
    query: 'what '
  })
});

const result = await response.json();
console.log('Answer:', result.answer);
console.log('Sources:', result.sources.length);
console.log('Latency:', result.latency, 'ms');