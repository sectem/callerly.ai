import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import DashboardLayout from '@/components/dashboard/layout';
import { Button, Form, Spinner, Alert } from 'react-bootstrap';
import { supabase } from '@/context/auth-context';
import styles from '@/styles/dashboard.module.css';
import { useRouter } from 'next/router';

const customStyles = {
  pageContainer: {
    width: '100%',
    padding: '2rem',
  },
  title: {
    color: '#1a1a1a',
    fontSize: '2.5rem',
    fontWeight: '600',
    marginBottom: '1.5rem',
  },
  formContainer: {
    width: '100%',
    padding: '1rem 0',
  },
  label: {
    color: '#1a1a1a',
    fontSize: '1rem',
    fontWeight: '500',
    marginBottom: '0.5rem',
  },
  helpText: {
    color: '#666666',
    fontSize: '0.875rem',
    marginTop: '0.5rem',
  },
  input: {
    width: '100%',
    height: '48px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '0 1rem',
    fontSize: '0.95rem',
    transition: 'border-color 0.2s ease',
    '&:focus': {
      borderColor: '#007bff',
      boxShadow: 'none',
    },
  },
  textarea: {
    width: '100%',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '1rem',
    fontSize: '0.95rem',
    transition: 'border-color 0.2s ease',
    '&:focus': {
      borderColor: '#007bff',
      boxShadow: 'none',
    },
  },
  button: {
    background: '#007bff',
    border: 'none',
    borderRadius: '8px',
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    fontWeight: '500',
    transition: 'background-color 0.2s ease',
    '&:hover': {
      background: '#0056b3',
    },
  },
  alert: {
    borderRadius: '8px',
    border: 'none',
    padding: '1rem 1.25rem',
    marginBottom: '2rem',
  },
  phoneAlert: {
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '2rem',
    color: '#1a1a1a',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  section: {
    marginBottom: '2rem',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '500',
    marginBottom: '1.5rem',
    color: '#1a1a1a',
  },
};

export default function AgentsPage() {
  const { user, loading: authLoading } = useAuth();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userPhoneNumber, setUserPhoneNumber] = useState(null);

  // Form states
  const [scriptContent, setScriptContent] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [endCallMessage, setEndCallMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const router = useRouter();

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!user) {
      router.push('/auth/login');
      return;
    }

    const loadData = async () => {
      try {
        // Get phone number first
        const { data: phoneData, error: phoneError } = await supabase
          .from('phone_numbers')
          .select('phone_number')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        console.log('Phone data:', phoneData);
        if (phoneError && phoneError.code !== 'PGRST116') {
          console.error('Phone number error:', phoneError);
          throw phoneError;
        }

        if (phoneData?.phone_number) {
          setUserPhoneNumber(phoneData.phone_number);
        }

        // Load agent data with scripts
        const { data: agentData, error: agentError } = await supabase
          .from('vapi_agents')
          .select(`
            id,
            vapi_agent_id,
            voice_id,
            voice_provider,
            is_active,
            scripts (
              id,
              script_content,
              first_message,
              end_call_message
            )
          `)
          .eq('user_id', user.id)
          .single();

        console.log('Agent data:', agentData);
        console.log('Agent error:', agentError);

        // If agent exists, load its data
        if (agentData) {
          setAgent(agentData);
          const script = agentData.scripts?.[0];
          console.log('Script data:', script);
          if (script) {
            setScriptContent(script.script_content || '');
            setFirstMessage(script.first_message || '');
            setEndCallMessage(script.end_call_message || '');
          }
        } else {
          // Set empty values if no agent exists
          setAgent(null);
          setScriptContent('');
          setFirstMessage('');
          setEndCallMessage('');
        }
      } catch (error) {
        console.error('Error loading agent data:', error);
        setError('Failed to load agent data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="container py-4">
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  const handleSaveAgent = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!userPhoneNumber) {
      setError('Please add a phone number in the settings page first');
      setSaving(false);
      return;
    }

    try {
      const functionPayload = {
        action: agent ? 'update_agent' : 'create_agent',
        phoneNumber: userPhoneNumber,
        scriptContent,
        firstMessage,
        endCallMessage,
        userId: user.id
      };

      // Add additional fields for update
      if (agent) {
        functionPayload.agentId = agent.id;
        functionPayload.vapiAgentId = agent.vapi_agent_id;
      }
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/vapi`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify(functionPayload)
        }
      );

      const vapiData = await response.json();

      if (!response.ok) {
        throw new Error(vapiData.error || 'Failed to save agent');
      }

      alert(agent ? 'Agent updated successfully!' : 'Agent added successfully!');
      
      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error in handleSaveAgent:', error);
      setError(error.message || 'Failed to save agent. Please check the console for details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div style={customStyles.pageContainer}>
        <h1 style={customStyles.title}>Configure AI Agent</h1>

        {!userPhoneNumber && (
          <div style={customStyles.phoneAlert}>
            <i className="bi bi-exclamation-circle"></i>
            <span>Please add a phone number in the settings page before configuring your AI agent.</span>
          </div>
        )}

        {userPhoneNumber && (
          <div style={customStyles.phoneAlert}>
            <i className="bi bi-phone"></i>
            <span>Configuring script for phone number: <strong>{userPhoneNumber}</strong></span>
          </div>
        )}

        {error && (
          <Alert variant="danger" style={customStyles.alert}>
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSaveAgent}>
          <div style={customStyles.section}>
            <h2 style={customStyles.sectionTitle}>Agent Configuration</h2>
            
            <Form.Group className="mb-4">
              <Form.Label style={customStyles.label}>First Message</Form.Label>
              <Form.Control
                type="text"
                value={firstMessage}
                onChange={(e) => setFirstMessage(e.target.value)}
                placeholder="Enter the first message your agent will say..."
                style={customStyles.input}
                required
              />
              <Form.Text style={customStyles.helpText}>
                This is the first message your AI agent will say when answering a call.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label style={customStyles.label}>Script Content</Form.Label>
              <Form.Control
                as="textarea"
                rows={10}
                value={scriptContent}
                onChange={(e) => setScriptContent(e.target.value)}
                placeholder="Enter your script content here..."
                style={customStyles.textarea}
                required
              />
              <Form.Text style={customStyles.helpText}>
                This is the main script your AI agent will use during conversations.
              </Form.Text>
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label style={customStyles.label}>End Call Message</Form.Label>
              <Form.Control
                type="text"
                value={endCallMessage}
                onChange={(e) => setEndCallMessage(e.target.value)}
                placeholder="Enter the message your agent will say when ending a call..."
                style={customStyles.input}
                required
              />
              <Form.Text style={customStyles.helpText}>
                This message will be used when your AI agent needs to end the call.
              </Form.Text>
            </Form.Group>
          </div>

          <Button
            type="submit"
            style={customStyles.button}
            disabled={saving || !userPhoneNumber}
          >
            {saving ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                {agent ? 'Updating...' : 'Adding...'}
              </>
            ) : (
              agent ? 'Update Agent' : 'Add Agent'
            )}
          </Button>
        </Form>
      </div>
    </DashboardLayout>
  );
}

AgentsPage.requireAuth = true; 