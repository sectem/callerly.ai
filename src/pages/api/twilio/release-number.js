import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { twilioSid } = req.body;

    if (!twilioSid) {
      return res.status(400).json({ error: 'Twilio SID is required' });
    }

    // Release the number from Twilio
    await client.incomingPhoneNumbers(twilioSid).remove();

    // Remove from database
    const { error } = await supabase
      .from('phone_numbers')
      .delete()
      .match({ twilio_sid: twilioSid });

    if (error) throw error;

    return res.status(200).json({ message: 'Phone number released successfully' });
  } catch (error) {
    console.error('Error releasing number:', error);
    return res.status(500).json({ 
      error: 'Failed to release number',
      details: error.message 
    });
  }
} 