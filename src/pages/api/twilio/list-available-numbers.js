import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { country = 'US', pattern = '', matchType = 'contains' } = req.query;

    // Search for available numbers
    const searchParams = {
      country: country.toUpperCase(),
      capabilities: { voice: true, SMS: true },
      limit: 20, // Increased limit for better search results
    };

    // Clean the pattern to only include numbers
    const cleanPattern = pattern.replace(/[^0-9]/g, '');

    // Add pattern matching based on matchType
    if (cleanPattern) {
      if (matchType === 'start') {
        // If the pattern is 3 digits, treat it as an area code
        if (cleanPattern.length === 3) {
          searchParams.areaCode = cleanPattern;
        } else {
          // For other patterns, use contains and filter later
          searchParams.contains = cleanPattern;
        }
      } else {
        // For contains and end patterns
        searchParams.contains = cleanPattern;
      }
    }

    console.log('Fetching numbers with params:', searchParams);

    let availableNumbers = await client.availablePhoneNumbers(country.toUpperCase())
      .local
      .list(searchParams);

    // Filter results based on matchType if not using area code
    if (cleanPattern && !(matchType === 'start' && cleanPattern.length === 3)) {
      availableNumbers = availableNumbers.filter(number => {
        const cleanNumber = number.phoneNumber.replace(/[^0-9]/g, '');
        switch (matchType) {
          case 'start':
            return cleanNumber.startsWith(cleanPattern);
          case 'end':
            return cleanNumber.endsWith(cleanPattern);
          case 'contains':
            return cleanNumber.includes(cleanPattern);
          default:
            return true;
        }
      });
    }

    console.log('Found numbers:', availableNumbers.length);

    // Format the response
    const formattedNumbers = availableNumbers.map(number => ({
      phoneNumber: number.phoneNumber,
      friendlyName: number.friendlyName || number.phoneNumber,
      region: number.region,
      locality: number.locality,
      capabilities: number.capabilities,
      isoCountry: number.isoCountry,
    }));

    return res.status(200).json(formattedNumbers);
  } catch (error) {
    console.error('Error in list-available-numbers:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch numbers',
      details: error.message 
    });
  }
} 