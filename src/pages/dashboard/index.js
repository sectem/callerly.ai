/**
 * Dashboard Home Page
 * 
 * Main dashboard view that displays overview and summary information.
 * This is the landing page after user login.
 * 
 * @page
 */
import { useEffect, useState } from 'react';
import { useAuth, supabase } from '@/context/auth-context';
import { SUPPORTED_COUNTRIES, MATCH_TYPES } from '@/utils/twilio';
import DashboardLayout from '@/components/dashboard/layout';
import { Button, Spinner, Modal, ListGroup, Form, Row, Col } from 'react-bootstrap';
import { FaPhone } from 'react-icons/fa';
import styles from '@/styles/dashboard.module.css';
import { useRouter } from 'next/router';
import Link from 'next/link';

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
    if (authLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }

    const loadData = async () => {
      try {
        // Load phone number from our database
        const { data: phoneData, error: phoneError } = await supabase
          .from('phone_numbers')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (phoneError) throw phoneError;
        setActiveNumber(phoneData);

        // Check agent status
        const { data: agent, error } = await supabase
          .from('vapi_agents')
          .select(`
            *,
            scripts (
              id,
              script_content
            )
          `)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        const isConfigured = agent && agent.scripts?.[0]?.script_content;

        setAgentStatus({
          loading: false,
          configured: !!isConfigured,
          agent
        });
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setAgentStatus({
          loading: false,
          configured: false,
          error: 'Failed to load data'
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, authLoading, router]);

  const handleSearch = async () => {
    setLoadingNumbers(true);
    setAvailableNumbers([]);
    try {
      console.log('Searching for numbers with params:', {
        country: selectedCountry,
        pattern: numberPattern,
        matchType
      });

      const { data, error } = await supabase.functions.invoke(
        'twilio',
        {
          body: JSON.stringify({
            action: 'search_numbers',
            country: selectedCountry,
            pattern: numberPattern,
            matchType
          })
        }
      );

      console.log('Search response:', { data, error });

      if (error) throw error;
      if (data?.numbers) {
        setAvailableNumbers(data.numbers);
      }
    } catch (error) {
      console.error('Error fetching available numbers:', error);
      alert('Failed to fetch available numbers. Please try again.');
    } finally {
      setLoadingNumbers(false);
    }
  };

  const handleShowAvailableNumbers = () => {
    setShowModal(true);
    handleSearch();
  };

  const handlePurchaseNumber = async (numberToPurchase) => {
    if (!user?.id || !numberToPurchase) {
      return;
    }

    try {
      setPurchasing(true);
      setSelectedNumber(numberToPurchase);
      console.log('Purchasing number:', numberToPurchase.phoneNumber);

      const { data, error } = await supabase.functions.invoke(
        'twilio',
        {
          body: JSON.stringify({
            action: 'purchase_number',
            phone_number: numberToPurchase.phoneNumber,
            user_id: user.id
          })
        }
      );

      console.log('Purchase response:', { data, error });

      if (error) {
        throw new Error(error.message || 'Failed to purchase number');
      }

      if (!data) {
        throw new Error('No response data from purchase request');
      }

      // Update local state with the new number
      setActiveNumber(data);
      handleModalClose();
      // Show success message
      alert('Phone number purchased successfully!');
    } catch (error) {
      console.error('Error purchasing number:', error);
      alert(error.message || 'Failed to purchase number. Please try again.');
    } finally {
      setPurchasing(false);
      setSelectedNumber(null);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setAvailableNumbers([]);
    setSelectedNumber(null);
    setNumberPattern('');
    setMatchType('contains');
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className={styles.pageContainer}>
        <h1 className={styles.pageTitle}>Dashboard</h1>
        
        <div className={styles.cardGrid}>
          {/* Phone Number Card */}
          <div className={styles.cardWrapper}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h5 className={styles.cardTitle}>Phone Number</h5>
              </div>
              <div className={styles.cardBody}>
                {activeNumber ? (
                  <div className="text-center py-4">
                    <div className="mb-3">
                      <FaPhone size={48} className="text-primary" />
                    </div>
                    <h4 className="mb-2">{activeNumber.phone_number}</h4>
                    <p className="text-muted mb-3">
                      Your active phone number
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="mb-3">
                      <FaPhone size={48} className="text-muted" />
                    </div>
                    <h4 className="mb-2">No Phone Number</h4>
                    <p className="text-muted mb-3">
                      Get a phone number to start making calls
                    </p>
                    <Button 
                      variant="primary"
                      onClick={handleShowAvailableNumbers}
                    >
                      Get Phone Number
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Balance Card */}
          <div className={styles.cardWrapper}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h5 className={styles.cardTitle}>Balance</h5>
              </div>
              <div className={styles.cardBody}>
                <div className="text-center py-4">
                  <div className="mb-3">
                    <i className="bi bi-wallet2" style={{ fontSize: '48px', color: '#198754' }}></i>
                  </div>
                  <h4 className="mb-2">$0.00</h4>
                  <p className="text-muted mb-3">
                    Available balance
                  </p>
                  <Button 
                    variant="outline-success"
                    onClick={() => {/* TODO: Add balance */}}
                  >
                    Add Balance
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Agent Status Card */}
          <div className={styles.cardWrapper}>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h5 className={styles.cardTitle}>AI Agent Status</h5>
              </div>
              <div className={styles.cardBody}>
                {agentStatus.loading ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" role="status">
                      <span className="visually-hidden">Loading agent status...</span>
                    </Spinner>
                  </div>
                ) : agentStatus.configured ? (
                  <div className="text-center py-4">
                    <div className="text-success mb-3">
                      <i className="bi bi-robot" style={{ fontSize: '48px' }}></i>
                    </div>
                    <h4 className="mb-2">Agent Configured</h4>
                    <p className="text-muted mb-3">
                      Your AI agent is ready to handle calls
                    </p>
                    <Link href="/dashboard/agents">
                      <Button variant="outline-primary">
                        Manage Agent
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="text-warning mb-3">
                      <i className="bi bi-robot" style={{ fontSize: '48px' }}></i>
                    </div>
                    <h4 className="mb-2">Agent Not Configured</h4>
                    <p className="text-muted mb-3">
                      Configure your AI agent to start handling calls
                    </p>
                    <Link href="/dashboard/agents">
                      <Button variant="primary">
                        Configure Agent
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Phone Number Selection Modal */}
        <Modal show={showModal} onHide={handleModalClose} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Get a Phone Number</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form className="mb-4">
              <Row>
                <Col md={4}>
                  <Form.Group className="mb-3">
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
                  <Form.Group className="mb-3">
                    <Form.Label>Number Pattern</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="e.g., 555"
                      value={numberPattern}
                      onChange={(e) => setNumberPattern(e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
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
              <div className="d-grid">
                <Button variant="primary" onClick={handleSearch} disabled={loadingNumbers}>
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
                      Searching...
                    </>
                  ) : (
                    'Search Numbers'
                  )}
                </Button>
              </div>
            </Form>

            {loadingNumbers ? (
              <div className="text-center py-4">
                <Spinner animation="border" role="status">
                  <span className="visually-hidden">Loading numbers...</span>
                </Spinner>
              </div>
            ) : availableNumbers.length > 0 ? (
              <ListGroup>
                {availableNumbers.slice(0, 10).map((number) => (
                  <ListGroup.Item
                    key={number.phoneNumber}
                    className="d-flex justify-content-between align-items-center"
                  >
                    <div>
                      <div className="fw-bold">{number.phoneNumber}</div>
                      <small className="text-muted">
                        {number.locality}, {number.region}
                      </small>
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handlePurchaseNumber(number)}
                      disabled={purchasing}
                    >
                      {purchasing && selectedNumber?.phoneNumber === number.phoneNumber ? (
                        <>
                          <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                            className="me-2"
                          />
                          Purchasing...
                        </>
                      ) : (
                        'Purchase'
                      )}
                    </Button>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            ) : (
              <div className="text-center text-muted py-4">
                No numbers found. Try adjusting your search criteria.
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleModalClose}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </DashboardLayout>
  );
}

Dashboard.requireAuth = true;