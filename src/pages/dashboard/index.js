/**
 * Dashboard Home Page
 * 
 * Main dashboard view that displays overview and summary information.
 * This is the landing page after user login.
 * 
 * @page
 */
import { useEffect, useState } from 'react';
import { useAuth } from '@/context/auth-context';
import { twilioUtils, SUPPORTED_COUNTRIES, MATCH_TYPES } from '@/utils/twilio';
import DashboardLayout from '@/components/dashboard/layout';
import { Button, Spinner, Modal, ListGroup, Form, Row, Col } from 'react-bootstrap';
import { FaPhone } from 'react-icons/fa';
import styles from '@/styles/dashboard.module.css';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '@/utils/supabase';

export default function Dashboard() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [activeNumber, setActiveNumber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [loadingNumbers, setLoadingNumbers] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [purchasing, setPurchasing] = useState(false);
  const [agentStatus, setAgentStatus] = useState({ loading: true, configured: false });

  // Search parameters
  const [selectedCountry, setSelectedCountry] = useState('US');
  const [numberPattern, setNumberPattern] = useState('');
  const [matchType, setMatchType] = useState('contains');

  useEffect(() => {
    const loadPhoneNumber = async () => {
      console.log('Loading phone number, user:', user);
      
      if (!user?.id) {
        console.log('No user found');
        setLoading(false);
        return;
      }
      
      try {
        const numbers = await twilioUtils.listPhoneNumbers(user.id);
        console.log('Fetched numbers:', numbers);
        setActiveNumber(numbers?.[0] || null);
      } catch (error) {
        console.error('Error loading phone number:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPhoneNumber();
  }, [user]);

  useEffect(() => {
    const checkAgentStatus = async () => {
      if (!user?.id) return;
      
      try {
        // Check if agent exists in database with scripts joined
        const { data: agent, error } = await supabase
          .from('vapi_agents')
          .select(`
            *,
            scripts (
              id,
              content
            )
          `)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        // Check if agent has all required fields
        const isConfigured = agent && 
          agent.scripts?.content && 
          agent.first_message && 
          agent.end_call_message && 
          agent.voicemail_message;

        setAgentStatus({
          loading: false,
          configured: !!isConfigured,
          agent
        });
      } catch (error) {
        console.error('Error checking agent status:', error);
        setAgentStatus({
          loading: false,
          configured: false,
          error: 'Failed to check agent status'
        });
      }
    };

    checkAgentStatus();
  }, [user]);

  const handleSearch = async () => {
    setLoadingNumbers(true);
    try {
      const numbers = await twilioUtils.listAvailableNumbers(
        selectedCountry,
        numberPattern,
        matchType
      );
      setAvailableNumbers(numbers);
    } catch (error) {
      console.error('Error fetching available numbers:', error);
      alert('Failed to fetch available numbers. Please try again.');
    } finally {
      setLoadingNumbers(false);
    }
  };

  const handleShowAvailableNumbers = () => {
    if (!user?.subscription) {
      router.push('/plans');
      return;
    }
    setShowModal(true);
    handleSearch();
  };

  const handlePurchaseNumber = async () => {
    if (!user?.subscription) {
      router.push('/plans');
      return;
    }
    if (!user?.id || !selectedNumber) {
      return;
    }

    try {
      setPurchasing(true);
      console.log('Purchasing number for user:', user.id);
      const newNumber = await twilioUtils.purchasePhoneNumber(user.id, selectedNumber.phoneNumber);
      console.log('Purchased number:', newNumber);
      setActiveNumber(newNumber);
      setShowModal(false);
      setSelectedNumber(null);
    } catch (error) {
      console.error('Error purchasing number:', error);
      alert('Failed to purchase number. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  useEffect(() => {
    if (user) {
      console.log('Dashboard user data:', {
        id: user.id,
        subscription: user.subscription,
        hasSubscription: !!user.subscription
      });
    }
  }, [user]);

  if (!user) {
    return (
      <DashboardLayout>
        <div className={styles.card}>
          <div className={styles.cardBody}>
            <div className="text-center py-4">
              <p>Please sign in to access the dashboard.</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
      <div className={styles.pageContainer}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        
        <div className={styles.cardGrid}>
          {/* Subscription Status Card */}
          <div className={styles.cardWrapper}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h5 className={styles.cardTitle}>Subscription</h5>
              </div>
              <div className={styles.cardBody}>
                {authLoading ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" role="status">
                      <span className="visually-hidden">Loading subscription status...</span>
                    </Spinner>
                  </div>
                ) : user?.subscription ? (
                  <div className="text-center py-4">
                    <div className="text-success mb-3">
                      <i className="bi bi-check-circle-fill" style={{ fontSize: '48px' }}></i>
                    </div>
                    <h4 className="mb-2">{user.subscription.plan} Plan</h4>
                    <p className="text-muted mb-3">
                      Active until {new Date(user.subscription.current_period_end).toLocaleDateString()}
                    </p>
                    <Button 
                      variant="outline-primary"
                      onClick={() => router.push('/dashboard/billing')}
                    >
                      Manage Subscription
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-danger mb-3">
                      <i className="bi bi-exclamation-circle-fill" style={{ fontSize: '48px' }}></i>
                    </div>
                    <h4 className="mb-2">No Active Subscription</h4>
                    <p className="text-muted mb-3">
                      Subscribe to a plan to start using our services.
                    </p>
                    <Button 
                      variant="primary"
                      onClick={() => router.push('/plans')}
                    >
                      View Plans
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Phone Number Card */}
          <div className={styles.cardWrapper}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h5 className={styles.cardTitle}>Phone Number</h5>
              </div>
              <div className={styles.cardBody}>
                {!activeNumber ? (
                  <div className="text-center py-4">
                    <FaPhone className={user?.subscription ? "text-primary" : "text-muted"} size={48} />
                    <p className="mb-4">You don't have an active phone number</p>
                    {user?.subscription ? (
                      <Button 
                        variant="primary" 
                        onClick={handleShowAvailableNumbers}
                        disabled={loadingNumbers}
                      >
                        {loadingNumbers ? (
                          <>
                            <Spinner
                              as="span"
                              animation="border"
                              size="sm"
                              role="status"
                              aria-hidden="true"
                              className="me-2"
                            />
                            Loading Numbers...
                          </>
                        ) : (
                          'Get a Number'
                        )}
                      </Button>
                    ) : (
                      <div>
                        <p className="text-danger mb-3">
                          <i className="bi bi-exclamation-circle-fill me-2"></i>
                          Subscription required to get a phone number
                        </p>
                        <Button 
                          variant="primary"
                          onClick={() => router.push('/plans')}
                        >
                          View Plans
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center">
                    <FaPhone className="text-success mb-3" size={32} />
                    <h3 className="mb-2">{activeNumber.phone_number}</h3>
                    <p className="text-muted mb-0">
                      {activeNumber.metadata.locality}, {activeNumber.metadata.region}
                    </p>
                    <div className="mt-3">
                      {activeNumber.capabilities.voice && (
                        <span className="badge bg-success me-2">Voice Enabled</span>
                      )}
                      {activeNumber.capabilities.SMS && (
                        <span className="badge bg-info">SMS Enabled</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Agent Status Card */}
          <div className={styles.cardWrapper}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h5 className={styles.cardTitle}>AI Agent Status</h5>
              </div>
              <div className={styles.cardBody}>
                {agentStatus.loading ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" role="status">
                      <span className="visually-hidden">Checking agent status...</span>
                    </Spinner>
                  </div>
                ) : agentStatus.configured ? (
                  <div className="text-center py-4">
                    <div className="text-success mb-3">
                      <i className="bi bi-check-circle-fill" style={{ fontSize: '48px' }}></i>
                    </div>
                    <h4 className="mb-2">AI Agent Configured</h4>
                    <p className="text-muted mb-3">
                      Your AI agent is properly configured and ready to handle calls.
                    </p>
                    <Button 
                      variant="outline-primary"
                      onClick={() => router.push('/dashboard/agents')}
                    >
                      View Configuration
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-warning mb-3">
                      <i className="bi bi-exclamation-circle-fill" style={{ fontSize: '48px' }}></i>
                    </div>
                    <h4 className="mb-2">AI Agent Not Configured</h4>
                    <p className="text-muted mb-3">
                      Please configure your AI agent to start handling calls.
                    </p>
                    <Button 
                      variant="primary"
                      onClick={() => router.push('/dashboard/agents')}
                    >
                      Configure Agent
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Available Numbers Modal */}
        <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Get a Phone Number</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {/* Search Form */}
            <Form className="mb-4">
              <Row className="g-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Country</Form.Label>
                    <Form.Select
                      value={selectedCountry}
                      onChange={(e) => setSelectedCountry(e.target.value)}
                    >
                      {SUPPORTED_COUNTRIES.map(country => (
                        <option key={country.code} value={country.code}>
                          {country.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Number Pattern</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="Enter digits"
                      value={numberPattern}
                      onChange={(e) => setNumberPattern(e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Match Type</Form.Label>
                    <Form.Select
                      value={matchType}
                      onChange={(e) => setMatchType(e.target.value)}
                    >
                      {MATCH_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
              <div className="mt-3">
                <Button
                  variant="secondary"
                  onClick={handleSearch}
                  disabled={loadingNumbers}
                >
                  Search Numbers
                </Button>
              </div>
            </Form>

            {/* Results List */}
            {loadingNumbers ? (
              <div className="text-center py-4">
                <Spinner animation="border" role="status">
                  <span className="visually-hidden">Loading numbers...</span>
                </Spinner>
              </div>
            ) : (
              <ListGroup>
                {availableNumbers.map((number) => (
                  <ListGroup.Item
                    key={number.phoneNumber}
                    action
                    active={selectedNumber?.phoneNumber === number.phoneNumber}
                    onClick={() => setSelectedNumber(number)}
                    className="d-flex justify-content-between align-items-center"
                  >
                    <div>
                      <h6 className="mb-1">{number.phoneNumber}</h6>
                      <small className="text-muted">
                        {number.locality}, {number.region}
                      </small>
                    </div>
                    <div>
                      {number.capabilities.voice && <span className="badge bg-success me-1">Voice</span>}
                      {number.capabilities.SMS && <span className="badge bg-info">SMS</span>}
                    </div>
                  </ListGroup.Item>
                ))}
                {availableNumbers.length === 0 && !loadingNumbers && (
                  <div className="text-center py-3">
                    <p className="mb-0">No numbers found matching your criteria</p>
                  </div>
                )}
              </ListGroup>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handlePurchaseNumber}
              disabled={!selectedNumber || purchasing}
            >
              {purchasing ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Getting Number...
                </>
              ) : (
                'Get Selected Number'
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </DashboardLayout>
  );
}

Dashboard.requireAuth = true;