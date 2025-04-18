import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from "../_shared/cors.ts"
import axios from "npm:axios"

// Types
interface Message {
  transcript: string;
  stereoRecordingUrl: string;
  customer: {
    number: string;
    [key: string]: any;
  };
  summary: string;
  [key: string]: any;
}

interface RequestBody {
  message: Message;
}

interface ExtractedData {
  callerType: 'seller' | 'buyer';
  name: string;
  email: string;
  appointmentTime: string;
  PriceOrBudgetForProperty: string;
  address: string;
  specification: string;
  TypeOfProperty: string;
  BuyerPurchasingType: 'cash' | 'finance';
  Timeline: string;
  ContractWithRealtor: 'yes' | 'no';
  phoneNumber?: string;
}

interface ResponseData {
  transcription: string;
  recordingURL: string;
  dialedNumber: {
    number: string;
    [key: string]: any;
  };
  summary: string;
  finalData: ExtractedData;
  processedAt: string;
}

// Constants
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const ZAPIER_WEBHOOK_URL = Deno.env.get('ZAPIER_WEBHOOK_URL')

if (!OPENAI_API_KEY || !ZAPIER_WEBHOOK_URL) {
  throw new Error('Missing required environment variables')
}

// Initialize axios client with retry logic
const axiosClient = axios.create({
    timeout: 20000,
    headers: { "Content-Type": "application/json" }
});

axiosClient.interceptors.response.use(undefined, async (err) => {
    const { config } = err;
    if (!config || config.retryCount >= 3) return Promise.reject(err);
    config.retryCount = (config.retryCount || 0) + 1;
    const backoff = Math.pow(2, config.retryCount) * 1000;
    await new Promise(resolve => setTimeout(resolve, backoff));
    return axiosClient(config);
});

/**
 * Extracts fields from transcription using OpenAI's GPT-4
 */
async function extractFieldsFromTranscription(transcription: string): Promise<ExtractedData> {
    try {
        const prompt = `
        Extract the customer's 'callerType', 'name', 'email', 'appointmentTime', 'PriceOrBudgetForProperty', 'address', 'specification', 'TypeOfProperty', 'BuyerPurchasingType', 'Timeline' and 'ContractWithRealtor' from the following transcription:
        Transcription: ${transcription}
        
        Provide the output in JSON format with the fields 'callerType', 'name', 'email', 'appointmentTime', 'PriceOrBudgetForProperty', 'address', 'specification', 'TypeOfProperty', 'BuyerPurchasingType', 'Timeline' and 'ContractWithRealtor'.
        callerType can be seller or buyer.
        ContractWithRealtor will be yes or no.
        BuyerPurchasingType can be cash or finance.
        `;
        
        const response = await axiosClient.post(
            "https://api.openai.com/v1/chat/completions",
            {
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are a helpful assistant for extracting specific fields from text."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ]
            },
            {
                headers: { Authorization: `Bearer ${OPENAI_API_KEY}` }
            }
        );

        return JSON.parse(response.data.choices[0].message.content.trim());
    } catch (error) {
        console.error("OpenAI API Error:", error.response?.data || error.message);
        throw new Error(`Failed to extract fields: ${error.message}`);
    }
}

/**
 * Validates the input data structure
 */
function validateInput(body: RequestBody): void {
    if (!body?.message) throw new Error('Missing message field');
    
    const required = ['transcript', 'stereoRecordingUrl', 'customer', 'summary'];
    const missing = required.filter(field => !body.message[field]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
}

// Supabase Edge Function handler
export const handler = async (req: Request): Promise<Response> => {
    try {
        // Parse and validate input
        const body: RequestBody = await req.json();
        validateInput(body);
        console.log(body);

        // Extract fields from transcription
        const extractedData = await extractFieldsFromTranscription(body.message.transcript);
        extractedData.phoneNumber = body.message.customer.number;

        // Prepare response data
        const responseData: ResponseData = {
            transcription: body.message.transcript,
            recordingURL: body.message.stereoRecordingUrl,
            dialedNumber: body.message.customer,
            summary: body.message.summary,
            finalData: extractedData,
            processedAt: new Date().toISOString()
        };
        console.log(responseData);

        // Send to Zapier
        await axiosClient.post(ZAPIER_WEBHOOK_URL, responseData);

        return new Response(
            JSON.stringify(responseData),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                    'Access-Control-Allow-Origin': '*'
                },
                status: 200
            }
        );

    } catch (error) {
        console.error("Function execution error:", error);
        
        return new Response(
            JSON.stringify({
                message: "An error occurred",
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                    'Access-Control-Allow-Origin': '*'
                },
                status: (error as any).statusCode || 500
            }
        );
    }
}; 

// Update the serve wrapper
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Remove authorization check since this is a public endpoint
    const response = await handler(req)
    
    // Add CORS headers to the response
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message || "Unknown error occurred",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    )
  }
}) 