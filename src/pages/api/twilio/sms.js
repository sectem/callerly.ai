import twilio from 'twilio';
import { twiml } from 'twilio';

const MessagingResponse = twiml.MessagingResponse;

export default async function handler(req, res) {
  try {
    const response = new MessagingResponse();
    
    // Add a simple auto-reply message
    response.message('Thank you for your message. This is an automated response.');

    // Set the response content type to XML
    res.setHeader('Content-Type', 'text/xml');
    res.status(200).send(response.toString());
  } catch (error) {
    console.error('Error handling SMS webhook:', error);
    res.status(500).json({ error: error.message });
  }
} 