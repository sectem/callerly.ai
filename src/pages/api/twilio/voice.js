import twilio from 'twilio';
import { twiml } from 'twilio';

const VoiceResponse = twiml.VoiceResponse;

export default async function handler(req, res) {
  try {
    const response = new VoiceResponse();
    
    // Add a simple greeting message
    response.say(
      { voice: 'alice' },
      'Thank you for calling. This is a demo voice response.'
    );

    // Set the response content type to XML
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(response.toString());
  } catch (error) {
    console.error('Error handling voice webhook:', error);
    res.status(500).json({ error: error.message });
  }
} 