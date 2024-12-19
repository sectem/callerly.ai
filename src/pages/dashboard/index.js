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

export default function Dashboard() {
  const { user } = useAuth();
  const [activeNumber, setActiveNumber] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState([]);
  const [loadingNumbers, setLoadingNumbers] = useState(false);
  const [selectedNumber, setSelectedNumber] = useState(null);
  const [purchasing, setPurchasing] = useState(false);

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
    setShowModal(true);
    handleSearch();
  };

  const handlePurchaseNumber = async () => {
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
        
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h5 className={styles.cardTitle}>Phone Number</h5>
          </div>
          <div className={styles.cardBody}>
            {!activeNumber ? (
              <div className="text-center py-4">
                <FaPhone className="text-primary mb-3" size={48} />
                <p className="mb-4">You don't have an active phone number</p>
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
                    'Purchase a Number'
                  )}
                </Button>
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

        {/* Available Numbers Modal */}
        <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Available Phone Numbers</Modal.Title>
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
                  Purchasing...
                </>
              ) : (
                'Purchase Selected Number'
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </DashboardLayout>
  );
}

Dashboard.requireAuth = true;