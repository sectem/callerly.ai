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
  const [voicemailMessage, setVoicemailMessage] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/login');
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
              name,
              script_content,
              first_message,
              end_call_message,
              voicemail_message
            )
          `)
          .eq('user_id', user.id)
          .single();

        // If agent exists, load its data
        if (agentData) {
          setAgent(agentData);
          const script = agentData.scripts?.[0];
          if (script) {
            setScriptContent(script.script_content || '');
            setFirstMessage(script.first_message || 'Hi, this is your AI assistant. How can I help you today?');
            setEndCallMessage(script.end_call_message || 'Thank you for your time. Have a great day!');
            setVoicemailMessage(script.voicemail_message || 'Hi, this is your AI assistant. I\'m sorry I missed your call. Please call back at your convenience.');
          }
        } else {
          // Set default values if no agent exists
          setAgent(null);
          setScriptContent('');
          setFirstMessage('Hi, this is your AI assistant. How can I help you today?');
          setEndCallMessage('Thank you for your time. Have a great day!');
          setVoicemailMessage('Hi, this is your AI assistant. I\'m sorry I missed your call. Please call back at your convenience.');
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
      // First, create or update the agent in VAPI
      const vapiResponse = await fetch('/api/vapi/create-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          phoneNumber: userPhoneNumber,
          scriptContent
        }),
      });

      const vapiData = await vapiResponse.json();
      if (!vapiResponse.ok) {
        throw new Error(vapiData.error || 'Failed to create VAPI agent');
      }

      // Then, create or update the agent in our database
      let agentId = agent?.id;
      
      if (!agentId) {
        // Create new VAPI agent
        const { data: newAgent, error: createError } = await supabase
          .from('vapi_agents')
          .insert({
            user_id: user.id,
            name: userPhoneNumber,
            vapi_agent_id: vapiData.id,
            voice_id: vapiData.voice_id,
            voice_provider: vapiData.voice_provider,
            is_active: true
          })
          .select()
          .single();

        if (createError) throw createError;
        agentId = newAgent.id;
      } else {
        // Update existing VAPI agent
        const { error: updateError } = await supabase
          .from('vapi_agents')
          .update({
            name: userPhoneNumber,
            vapi_agent_id: vapiData.id,
            voice_id: vapiData.voice_id,
            voice_provider: vapiData.voice_provider,
            is_active: true
          })
          .eq('id', agentId);

        if (updateError) throw updateError;
      }

      // Create or update the script
      const { error: scriptError } = await supabase
        .from('scripts')
        .upsert({
          agent_id: agentId,
          name: userPhoneNumber,
          script_content: scriptContent,
          first_message: firstMessage,
          end_call_message: endCallMessage,
          voicemail_message: voicemailMessage
        }, {
          onConflict: 'agent_id'
        });

      if (scriptError) throw scriptError;

      // Reload the complete agent data
      const { data: updatedAgent, error: loadError } = await supabase
        .from('vapi_agents')
        .select(`
          id,
          vapi_agent_id,
          voice_id,
          voice_provider,
          name,
          is_active,
          scripts (
            id,
            content
          )
        `)
        .eq('id', agentId)
        .single();

      if (loadError) throw loadError;
      setAgent(updatedAgent);

    } catch (error) {
      console.error('Error saving agent:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

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
                <Form.Label style={customStyles.label}>Script Content</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={10}
                  value={scriptContent}
                  onChange={(e) => setScriptContent(e.target.value)}
                  required
                  placeholder="Enter the script content that defines your agent's behavior and knowledge"
                  style={customStyles.textarea}
                />
                <Form.Text style={customStyles.helpText}>
                  This is the main script content that defines your agent's behavior and knowledge.
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