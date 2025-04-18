/**
 * Contacts Page
 * 
 * Manages user contacts and their conversation history.
 * 
 * @page
 */
import { useState, useEffect } from 'react';
import { useAuth, supabase } from '@/context/auth-context';
import DashboardLayout from '@/components/dashboard/layout';
import ContactList from '@/components/contacts/contact-list';
import { Spinner } from 'react-bootstrap';

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    loadContacts();
  }, [user]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setContacts(data || []);

    } catch (err) {
      console.error('Error loading contacts:', err);
      setError('Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="d-flex justify-content-center py-5">
          <Spinner animation="border" variant="primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container-fluid">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="h3 mb-0">Contacts</h1>
        </div>
        {error ? (
          <div className="alert alert-danger">{error}</div>
        ) : (
          <ContactList contacts={contacts} onContactsChange={loadContacts} />
        )}
      </div>
    </DashboardLayout>
  );
}

Contacts.requireAuth = true; 