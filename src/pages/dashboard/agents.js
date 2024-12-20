import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import DashboardLayout from '@/components/dashboard/layout';
import { Button, Form, Spinner, Alert } from 'react-bootstrap';
import { createClient } from '@supabase/supabase-js';
import styles from '@/styles/dashboard.module.css';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

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
  const { user } = useAuth();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userPhoneNumber, setUserPhoneNumber] = useState(null);

  // Form states
  const [scriptContent, setScriptContent] = useState('');
  const [firstMessage, setFirstMessage] = useState('');
  const [endCallMessage, setEndCallMessage] = useState('');
  const [voicemailMessage, setVoicemailMessage] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadAgent();
      loadUserPhoneNumber();
    }
  }, [user]);

  const loadAgent = async () => {
    try {
      console.log('Loading agent for user:', user.id);
      
      const { data, error } = await supabase
        .from('vapi_agents')
        .select(`
          *,
          scripts (
            id,
            title,
            content
          )
        `)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Loaded agent:', data);
      setAgent(data);
      
      if (data) {
        setScriptContent(data.scripts?.content || '');
        setFirstMessage(data.first_message || '');
        setEndCallMessage(data.end_call_message || '');
        setVoicemailMessage(data.voicemail_message || '');
      }
    } catch (error) {
      console.error('Error loading agent:', error);
      setError('Failed to load agent');
    } finally {
      setLoading(false);
    }
  };

  const loadUserPhoneNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('phone_numbers')
        .select('phone_number')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setUserPhoneNumber(data?.phone_number);
    } catch (error) {
      console.error('Error loading phone number:', error);
    }
  };

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
      const endpoint = agent ? '/api/vapi/update-script' : '/api/vapi/create-agent';
      const method = agent ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          agentId: agent?.id,
          name: userPhoneNumber,
          scriptContent,
          phoneNumber: userPhoneNumber,
          firstMessage,
          endCallMessage,
          voicemailMessage
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${agent ? 'update' : 'create'} agent`);
      }

      loadAgent();
    } catch (error) {
      console.error('Error saving agent:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div style={customStyles.pageContainer}>
        <h1 style={customStyles.title}>Configure Your AI Agent</h1>

        {error && (
          <Alert 
            variant="danger" 
            onClose={() => setError(null)} 
            dismissible
            style={customStyles.alert}
          >
            {error}
          </Alert>
        )}

        {!userPhoneNumber && (
          <div style={customStyles.phoneAlert}>
            <i className="bi bi-exclamation-circle"></i>
            Please add a phone number in the settings page before creating an agent.
          </div>
        )}

        {userPhoneNumber && (
          <div style={customStyles.phoneAlert}>
            <i className="bi bi-phone"></i>
            Configuring agent for: <strong>{userPhoneNumber}</strong>
          </div>
        )}

        <div style={customStyles.formContainer}>
          <Form onSubmit={handleSaveAgent}>
            <div style={customStyles.section}>
              <h2 style={customStyles.sectionTitle}>Agent Messages</h2>
              
              <Form.Group className="mb-4">
                <Form.Label style={customStyles.label}>First Message</Form.Label>
                <Form.Control
                  type="text"
                  value={firstMessage}
                  onChange={(e) => setFirstMessage(e.target.value)}
                  required
                  placeholder="Hi, this is [Agent Name]. How can I assist you today?"
                  style={customStyles.input}
                />
                <Form.Text style={customStyles.helpText}>
                  This is what the agent will say when starting a call.
                </Form.Text>
              </Form.Group>
            </div>

            <div style={customStyles.section}>
              <Form.Group>
                <Form.Label style={customStyles.label}>System Prompt</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={10}
                  value={scriptContent}
                  onChange={(e) => setScriptContent(e.target.value)}
                  required
                  placeholder="Enter the system prompt that defines your agent's behavior and knowledge"
                  style={customStyles.textarea}
                />
                <Form.Text style={customStyles.helpText}>
                  This is the main system prompt that defines your agent's behavior and knowledge.
                </Form.Text>
              </Form.Group>
            </div>

            <div style={customStyles.section}>
              <Form.Group className="mb-4">
                <Form.Label style={customStyles.label}>End Call Message</Form.Label>
                <Form.Control
                  type="text"
                  value={endCallMessage}
                  onChange={(e) => setEndCallMessage(e.target.value)}
                  required
                  placeholder="Thank you for your time. Have a great day!"
                  style={customStyles.input}
                />
                <Form.Text style={customStyles.helpText}>
                  This is what the agent will say before ending a call.
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-0">
                <Form.Label style={customStyles.label}>Voicemail Message</Form.Label>
                <Form.Control
                  type="text"
                  value={voicemailMessage}
                  onChange={(e) => setVoicemailMessage(e.target.value)}
                  required
                  placeholder="Hi, this is [Agent Name]. I'm sorry I missed your call. Please call back at your convenience."
                  style={customStyles.input}
                />
                <Form.Text style={customStyles.helpText}>
                  This is what the agent will say when leaving a voicemail.
                </Form.Text>
              </Form.Group>
            </div>

            <div className="d-flex justify-content-end mt-4">
              <Button 
                type="submit" 
                disabled={saving || !userPhoneNumber}
                style={customStyles.button}
              >
                {saving ? (
                  <>
                    <Spinner size="sm" className="me-2" /> 
                    {agent ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  agent ? 'Update Agent' : 'Create Agent'
                )}
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </DashboardLayout>
  );
}

AgentsPage.requireAuth = true; 