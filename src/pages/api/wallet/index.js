import { createPagesServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export default async function handler(req, res) {
  try {
    const supabase = createPagesServerClient({ req, res });

    // Get user session
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = session.user;

    if (req.method === 'GET') {
      try {
        // Get wallet info
        let walletData;
        const { data: wallet, error: walletError } = await supabase
          .from('wallets')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (walletError && walletError.code === 'PGRST116') {
          // If wallet doesn't exist, create one
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
          walletData = createdWallet;
        } else if (walletError) {
          throw walletError;
        } else {
          walletData = wallet;
        }

        // Get recent transactions
        const { data: transactions, error: transactionsError } = await supabase
          .from('wallet_transactions')
          .select(`
            *,
            vapi_agents (
              name,
              avatar_url
            )
          `)
          .eq('wallet_id', walletData.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (transactionsError) {
          throw transactionsError;
        }

        return res.status(200).json({ wallet: walletData, transactions: transactions || [] });
      } catch (error) {
        console.error('Error fetching wallet data:', error);
        return res.status(500).json({ error: 'Failed to fetch wallet data' });
      }
    } 
    
    else if (req.method === 'POST') {
      try {
        const { amount, type = 'purchase', description } = req.body;

        if (!amount || typeof amount !== 'number' || amount <= 0) {
          return res.status(400).json({ error: 'Invalid amount' });
        }

        const { data, error } = await supabase.rpc('add_wallet_credits', {
          p_user_id: user.id,
          p_amount: amount,
          p_transaction_type: type,
          p_description: description || 'Credit purchase'
        });

        if (error) throw error;

        return res.status(200).json({ success: true, transaction_id: data });
      } catch (error) {
        console.error('Error adding credits:', error);
        return res.status(500).json({ error: 'Failed to add credits' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
