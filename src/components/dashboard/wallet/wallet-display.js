'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, Button, Table } from 'react-bootstrap';
import { formatDistanceToNow } from 'date-fns';
import CreditPurchaseModal from './credit-purchase-modal';
import { useAuth } from '@/context/auth-context';

export default function WalletDisplay() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  
  const supabase = createClientComponentClient();
  const { user } = useAuth();

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        setError('Please sign in to view your wallet');
        return;
      }

      // Get wallet info directly from Supabase
      const { data: walletData, error: walletError } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (walletError && walletError.code !== 'PGRST116') {
        throw walletError;
      }

      let currentWallet = walletData;

      // If wallet doesn't exist, create one
      if (!currentWallet) {
        const { data: newWallet, error: createError } = await supabase.rpc('add_wallet_credits', {
          p_user_id: user.id,
          p_amount: 0,
          p_transaction_type: 'purchase',
          p_description: 'Initial wallet creation'
        });

        if (createError) throw createError;

        // Fetch the newly created wallet
        const { data: createdWallet, error: fetchError } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (fetchError) throw fetchError;
        currentWallet = createdWallet;
      }

      // Get transactions
      const { data: transactions, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setWallet(currentWallet);
      setTransactions(transactions || []);
    } catch (err) {
      console.error('Error fetching wallet data:', err);
      setError(err.message || 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchWalletData();
    }
  }, [user]);

  // Check for successful purchase
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('purchase') === 'success') {
      fetchWalletData();
      // Clear the URL parameter
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  if (!user) {
    return <div>Please sign in to view your wallet</div>;
  }

  if (loading) return <div>Loading wallet information...</div>;
  if (error) return <div className="text-danger">Error: {error}</div>;
  if (!wallet) return <div>No wallet found.</div>;

  return (
    <div className="wallet-display">
      <Card className="mb-4">
        <Card.Body>
          <Card.Title>Your Credits Balance</Card.Title>
          <div className="d-flex justify-content-between align-items-center">
            <h2 className="mb-0">{wallet.credits_balance} minutes</h2>
            <Button 
              variant="primary" 
              onClick={() => setShowPurchaseModal(true)}
            >
              Add Credits
            </Button>
          </div>
        </Card.Body>
      </Card>

      <Card>
        <Card.Body>
          <Card.Title>Recent Transactions</Card.Title>
          <Table responsive>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Amount</th>
                <th>Description</th>
                <th>Agent</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{formatDistanceToNow(new Date(transaction.created_at), { addSuffix: true })}</td>
                  <td className="text-capitalize">{transaction.transaction_type}</td>
                  <td className={transaction.amount > 0 ? 'text-success' : 'text-danger'}>
                    {transaction.amount > 0 ? '+' : ''}{transaction.amount} minutes
                  </td>
                  <td>{transaction.description}</td>
                  <td>
                    {transaction.vapi_agents ? (
                      <div className="d-flex align-items-center">
                        {transaction.vapi_agents.agent_name}
                        {transaction.vapi_agents.phone_number && (
                          <span className="text-muted ms-2">
                            ({transaction.vapi_agents.phone_number})
                          </span>
                        )}
                      </div>
                    ) : '-'}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center">No transactions found</td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <CreditPurchaseModal
        show={showPurchaseModal}
        onHide={() => setShowPurchaseModal(false)}
        onPurchaseComplete={fetchWalletData}
      />
    </div>
  );
}
