import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/layout';
import { useAuth } from '@/context/auth-context';
import { supabase } from '@/utils/supabase';

export default function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    company: '',
    phone: '',
    role: ''
  });

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.id) return;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, company, phone, role')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setError('Failed to load profile information. Please try refreshing the page.');
        return;
      }

      if (profileData) {
        setProfile({
          first_name: profileData.first_name || '',
          last_name: profileData.last_name || '',
          company: profileData.company || '',
          phone: profileData.phone || '',
          role: profileData.role || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile information');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear any previous success/error messages
    setSuccess(false);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          company: profile.company,
          phone: profile.phone,
          role: profile.role,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        throw updateError;
      }

      setSuccess(true);
      await fetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile information. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container py-4">
          <div className="d-flex justify-content-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-4">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            <div className="card shadow-sm">
              <div className="card-body">
                <h1 className="h3 mb-4">Profile Settings</h1>

                {error && (
                  <div className="alert alert-danger" role="alert">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {error}
                  </div>
                )}

                {success && (
                  <div className="alert alert-success" role="alert">
                    <i className="bi bi-check-circle me-2"></i>
                    Profile updated successfully!
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label htmlFor="first_name" className="form-label">First Name</label>
                      <input
                        type="text"
                        className="form-control"
                        id="first_name"
                        name="first_name"
                        value={profile.first_name}
                        onChange={handleChange}
                        placeholder="Enter your first name"
                      />
                    </div>

                    <div className="col-md-6">
                      <label htmlFor="last_name" className="form-label">Last Name</label>
                      <input
                        type="text"
                        className="form-control"
                        id="last_name"
                        name="last_name"
                        value={profile.last_name}
                        onChange={handleChange}
                        placeholder="Enter your last name"
                      />
                    </div>

                    <div className="col-md-6">
                      <label htmlFor="company" className="form-label">Company</label>
                      <input
                        type="text"
                        className="form-control"
                        id="company"
                        name="company"
                        value={profile.company}
                        onChange={handleChange}
                        placeholder="Enter your company name"
                      />
                    </div>

                    <div className="col-md-6">
                      <label htmlFor="phone" className="form-label">Phone Number</label>
                      <input
                        type="tel"
                        className="form-control"
                        id="phone"
                        name="phone"
                        value={profile.phone}
                        onChange={handleChange}
                        placeholder="Enter your phone number"
                      />
                    </div>

                    <div className="col-md-6">
                      <label htmlFor="role" className="form-label">Role</label>
                      <input
                        type="text"
                        className="form-control"
                        id="role"
                        name="role"
                        value={profile.role}
                        onChange={handleChange}
                        placeholder="Enter your role"
                      />
                    </div>

                    <div className="col-12">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                            Saving...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-save me-2"></i>
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            <div className="card shadow-sm mt-4">
              <div className="card-body">
                <h2 className="h4 mb-4">Email Settings</h2>
                <p className="text-muted mb-0">
                  Your email address is <strong>{user?.email}</strong>
                </p>
                <small className="text-muted">
                  To change your email address, please contact support.
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
} 