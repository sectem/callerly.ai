import { useState } from 'react';
import { Row, Col, Card, Button, Modal, Form } from 'react-bootstrap';
import { supabase } from '@/context/auth-context';
import Link from 'next/link';

export default function ContactList({ contacts, onContactsChange }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);

      const { error: saveError } = await supabase
        .from('contacts')
        .insert([formData]);

      if (saveError) throw saveError;

      setShowAddModal(false);
      setFormData({ name: '', phone: '', email: '' });
      onContactsChange();

    } catch (err) {
      console.error('Error saving contact:', err);
      setError('Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="mb-4">
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          <i className="bi bi-plus-lg me-2"></i>
          Add Contact
        </Button>
      </div>

      <Row className="g-4">
        {contacts.map(contact => (
          <Col key={contact.id} md={6} lg={4}>
            <Card>
              <Card.Body>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h5 className="mb-1">{contact.name}</h5>
                    <p className="text-muted mb-0 small">
                      <i className="bi bi-telephone me-2"></i>
                      {contact.phone}
                    </p>
                    {contact.email && (
                      <p className="text-muted mb-0 small">
                        <i className="bi bi-envelope me-2"></i>
                        {contact.email}
                      </p>
                    )}
                  </div>
                  <Link 
                    href={`/dashboard/contacts/${contact.id}`}
                    className="btn btn-sm btn-outline-primary"
                  >
                    View Details
                  </Link>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>

      <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Contact</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={e => setFormData(d => ({ ...d, name: e.target.value }))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Phone</Form.Label>
              <Form.Control
                type="tel"
                value={formData.phone}
                onChange={e => setFormData(d => ({ ...d, phone: e.target.value }))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email (Optional)</Form.Label>
              <Form.Control
                type="email"
                value={formData.email}
                onChange={e => setFormData(d => ({ ...d, email: e.target.value }))}
              />
            </Form.Group>
            <div className="d-flex justify-content-end gap-2">
              <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Contact'}
              </Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </>
  );
} 