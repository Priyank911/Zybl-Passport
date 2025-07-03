// API Router for Vercel deployment
import githubOAuth from './github-oauth.js';
import verifyPayment from './verify-payment.js';
import healthCheck from './health.js';

export default async function handler(req, res) {
  const { url } = req;
  
  // Parse the URL to get the endpoint
  const urlParts = url.split('/');
  const endpoint = urlParts[urlParts.length - 1];
  
  try {
    // Route to appropriate handler
    switch (endpoint) {
      case 'github-oauth':
        return await githubOAuth(req, res);
      case 'verify-payment':
        return await verifyPayment(req, res);
      case 'health':
        return await healthCheck(req, res);
      default:
        // Default health check
        return res.status(200).json({ 
          status: 'ok', 
          message: 'Zybl API is running',
          timestamp: new Date().toISOString(),
          endpoints: [
            '/api/github-oauth',
            '/api/verify-payment',
            '/api/health'
          ]
        });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message 
    });
  }
}
