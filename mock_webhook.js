const axios = require('axios');

// Get arguments from CLI
const username = process.argv[2] || 'dev_tester';
const commentText = process.argv[3] || 'Assalomu alaykum! Narxi qancha ekan?';

console.log(`[TEST] Simulating comment from @${username}: "${commentText}"`);

const mockPayload = {
  object: 'instagram',
  entry: [
    {
      id: 'mock_entry_id_' + Date.now(),
      time: Math.floor(Date.now() / 1000),
      changes: [
        {
          field: 'comments',
          value: {
            from: {
              id: 'mock_user_123',
              username: username
            },
            id: 'mock_comment_' + Math.random().toString(36).substr(2, 9),
            text: commentText,
            media: {
              id: 'mock_media_reel_789'
            }
          }
        }
      ]
    }
  ]
};

// Send post request to local server
axios.post('http://localhost:3000/webhook', mockPayload)
  .then(response => {
    console.log(`[TEST] Success! Server returned status code: ${response.status} (${response.statusText})`);
    console.log('[TEST] Server response content:', response.data);
    console.log('[TEST] Check your logs.json or the web dashboard to see the execution status.');
  })
  .catch(error => {
    console.error('[TEST] Failed to connect to server.');
    if (error.response) {
      console.error(`[TEST] Server returned error status: ${error.response.status}`);
      console.error('[TEST] Response body:', error.response.data);
    } else {
      console.error('[TEST] Error message:', error.message);
      console.error('[TEST] Make sure the server is running on port 3000 (run: npm start).');
    }
  });
