/**
 * VAPI Integration Utilities
 * 
 * This module provides functions for interacting with the VAPI API.
 */

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const VAPI_BASE_URL = 'https://api.vapi.ai'; // Base URL without /api

/**
 * Create a new VAPI agent
 * @param {string} name - The name of the agent
 * @param {string} scriptContent - The script content for the agent
 * @param {string} firstMessage - The first message for the agent
 * @param {string} endCallMessage - The end call message for the agent
 * @param {string} voicemailMessage - The voicemail message for the agent
 * @returns {Promise<Object>} - The created agent details
 */
export async function createVapiAgent(name, scriptContent, firstMessage, endCallMessage, voicemailMessage) {
    try {
        console.log('Creating VAPI agent:', { name });

        const vapiResponse = await fetch(`${VAPI_BASE_URL}/assistant`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${VAPI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name,
                "transcriber": {
                    "provider": "deepgram",
                    "language": "en-US",
                    "model": "nova-2-phonecall"
                },
                "model": {
                    "provider": "openai",
                    "model": "gpt-4o",
                    "maxTokens": 1000,
                    "temperature": 0.7,
                    "emotionRecognitionEnabled": true,
                    "messages": [
                        {
                            "role": "system",
                            "content": scriptContent
                        }
                    ]
                },
                "voice": {
                    "provider": "deepgram",
                    "voiceId": "luna", 
                    "fillerInjectionEnabled": true
                },
                "firstMessage": firstMessage,
                "firstMessageMode": "assistant-speaks-first",
                "backgroundSound": "office",
                "backgroundDenoisingEnabled": true,
                "serverMessages": [
                    "end-of-call-report"
                ],
                "server": {
                    "url": "https://sdvzu753p5mbhu3a3lsj23ufje0zldtj.lambda-url.us-east-1.on.aws"
                },
                "endCallMessage": endCallMessage,
                "startSpeakingPlan": {
                    "waitSeconds": 1.5,
                    "smartEndpointingEnabled": true,
                    "transcriptionEndpointingPlan": {
                        "onPunctuationSeconds": 0.5,
                        "onNoPunctuationSeconds": 1.5,
                        "onNumberSeconds": 0.5
                    }
                },
                "silenceTimeoutSeconds": 20,
                "endCallPhrases": [
                    "bye for now",
                    "talk soon"
                ],
                "endCallFunctionEnabled": true,
                "voicemailMessage": voicemailMessage
            }),

        });

        console.log('VAPI Response Status:', vapiResponse.status);
        const vapiData = await vapiResponse.json();
        console.log('VAPI Response Data:', vapiData);

        if (!vapiResponse.ok) {
            throw new Error(`Failed to create VAPI agent: ${vapiData.message || vapiResponse.statusText}`);
        }

        return vapiData;
    } catch (error) {
        console.error('Error creating agent:', error);
        throw error;
    }
}

/**
 * Update an existing VAPI agent's details
 * @param {string} agentId - The VAPI agent ID
 * @param {string} scriptContent - The new script content
 * @param {string} name - The new agent name
 * @param {string} firstMessage - The new first message
 * @param {string} endCallMessage - The new end call message
 * @param {string} voicemailMessage - The new voicemail message
 * @returns {Promise<Object>} - The updated agent details
 */
export async function updateAgentScript(agentId, scriptContent, name, firstMessage, endCallMessage, voicemailMessage) {
    try {
        const response = await fetch(`${VAPI_BASE_URL}/assistant/${agentId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${VAPI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name,
                model: {
                    provider: "openai",
                    model: "gpt-4",
                    messages: [
                        {
                            role: "system",
                            content: scriptContent
                        }
                    ],
                    maxTokens: 1000,
                    temperature: 0.7,
                    emotionRecognitionEnabled: true
                },
                firstMessage,
                endCallMessage,
                voicemailMessage
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to update agent: ${errorData.message || response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error updating agent:', error);
        throw error;
    }
}

/**
 * Associate a phone number with a VAPI agent
 * @param {string} agentId - The VAPI agent ID
 * @param {string} phoneNumber - The phone number to associate (must be in E.164 format)
 * @returns {Promise<Object>} - The updated agent details
 */
export async function associatePhoneNumber(agentId, phoneNumber) {
    try {
        // Ensure phone number is in E.164 format
        const formattedNumber = phoneNumber.startsWith('+') ? phoneNumber : `+1${phoneNumber.replace(/\D/g, '')}`;
        
        const response = await fetch(`${VAPI_BASE_URL}/phone-number`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${VAPI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                number: formattedNumber,
                provider: 'twilio',
                assistantId: agentId,
                twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
                twilioAuthToken: process.env.TWILIO_AUTH_TOKEN
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to associate phone number: ${errorData.message || response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error associating phone number:', error);
        throw error;
    }
}

/**
 * Get a VAPI agent's details
 * @param {string} agentId - The VAPI agent ID
 * @returns {Promise<Object>} - The agent details
 */
export async function getAgentDetails(agentId) {
    try {
        const response = await fetch(`${VAPI_BASE_URL}/assistant/${agentId}`, {
            headers: {
                'Authorization': `Bearer ${VAPI_API_KEY}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to get agent details: ${errorData.message || response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting agent details:', error);
        throw error;
    }
}

/**
 * Delete a VAPI agent
 * @param {string} agentId - The VAPI agent ID
 * @returns {Promise<void>}
 */
export async function deleteAgent(agentId) {
    try {
        const response = await fetch(`${VAPI_BASE_URL}/assistant/${agentId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${VAPI_API_KEY}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to delete agent: ${errorData.message || response.statusText}`);
        }
    } catch (error) {
        console.error('Error deleting agent:', error);
        throw error;
    }
}

/**
 * List all VAPI agents
 * @returns {Promise<Array>} - List of agents
 */
export async function listAgents() {
    try {
        const response = await fetch(`${VAPI_BASE_URL}/assistant`, {
            headers: {
                'Authorization': `Bearer ${VAPI_API_KEY}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to list agents: ${errorData.message || response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error listing agents:', error);
        throw error;
    }
}

/**
 * Import a Twilio number into VAPI
 * @param {string} phoneNumber - The Twilio phone number to import
 * @returns {Promise<Object>} - The imported phone number details
 */
export async function importTwilioNumber(phoneNumber) {
    try {
        const response = await fetch(`${VAPI_BASE_URL}/phone-numbers/import`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${VAPI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phoneNumber: phoneNumber,
                provider: 'twilio'
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to import Twilio number: ${errorData.message || response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error importing Twilio number:', error);
        throw error;
    }
}

/**
 * Create a new VAPI agent with associated Twilio number
 * @param {string} name - The name of the agent
 * @param {string} scriptContent - The script content for the agent
 * @param {string} phoneNumber - The Twilio phone number to associate
 * @param {string} firstMessage - The first message for the agent
 * @param {string} endCallMessage - The end call message for the agent
 * @param {string} voicemailMessage - The voicemail message for the agent
 * @returns {Promise<Object>} - The created agent details with phone number
 */
export async function createVapiAgentWithPhone(
    name, 
    scriptContent, 
    phoneNumber, 
    firstMessage, 
    endCallMessage, 
    voicemailMessage
) {
    try {
        // First create the agent
        const agent = await createVapiAgent(
            name, 
            scriptContent, 
            firstMessage, 
            endCallMessage, 
            voicemailMessage
        );
        
        // Associate the phone number with the agent
        await associatePhoneNumber(agent.id, phoneNumber);
        
        // Get the updated agent details
        const updatedAgent = await getAgentDetails(agent.id);
        
        return updatedAgent;
    } catch (error) {
        console.error('Error creating agent with phone number:', error);
        throw error;
    }
} 