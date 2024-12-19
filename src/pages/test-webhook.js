import { useState } from 'react';
import { useAuth } from '@/context/auth-context';

export default function TestWebhook() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const { user } = useAuth();

  const handleTestWebhook = async () => {
    if (!user) {
      alert('Please sign in first');
      return;
    }

    try {
      setLoading(true);
      setResult(null);

      const response = await fetch('/api/stripe/test-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id
        }),
      });

      const data = await response.json();
      setResult(data);

    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <h1 className="mb-4">Test Stripe Webhook</h1>
      
      <div className="card">
        <div className="card-body">
          <h5 className="card-title mb-3">Test Subscription Creation</h5>
          
          {user ? (
            <>
              <p className="text-muted mb-3">User ID: {user.id}</p>
              <button
                className="btn btn-primary"
                onClick={handleTestWebhook}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Test Webhook'}
              </button>
            </>
          ) : (
            <p className="text-warning">Please sign in to test the webhook</p>
          )}

          {result && (
            <div className="mt-4">
              <h6>Result:</h6>
              <pre className="bg-light p-3 rounded">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 