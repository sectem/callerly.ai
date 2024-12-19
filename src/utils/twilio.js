import { supabase } from './supabase';

// List of supported countries with their codes and names
export const SUPPORTED_COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  // Add more countries as needed
];

export const MATCH_TYPES = [
  { value: 'contains', label: 'Contains Digits' },
  { value: 'start', label: 'Starts With' },
  { value: 'end', label: 'Ends With' },
];

export const twilioUtils = {
  /**
   * List available phone numbers
   * @param {string} country - Country code (e.g., 'US')
   * @param {string} pattern - Number pattern to match
   * @param {string} matchType - Type of pattern matching ('contains', 'start', 'end')
   * @returns {Promise<Array>} List of available phone numbers
   */
  async listAvailableNumbers(country = 'US', pattern = '', matchType = 'contains') {
    try {
      const queryParams = new URLSearchParams({
        country,
        ...(pattern && { pattern, matchType })
      });

      const response = await fetch(`/api/twilio/list-available-numbers?${queryParams}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch available numbers');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching available numbers:', error);
      throw error;
    }
  },

  /**
   * Purchase a specific phone number for a user
   * @param {string} userId - The user's ID
   * @param {string} phoneNumber - The phone number to purchase
   * @returns {Promise<Object>} The purchased phone number details
   */
  async purchasePhoneNumber(userId, phoneNumber) {
    try {
      const response = await fetch('/api/twilio/purchase-number', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          phoneNumber,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to purchase number');
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error purchasing phone number:', error);
      throw error;
    }
  },

  /**
   * List all phone numbers for a user
   * @param {string} userId - The user's ID
   * @returns {Promise<Array>} List of phone numbers
   */
  async listPhoneNumbers(userId) {
    try {
      const { data, error } = await supabase
        .from('phone_numbers')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error listing phone numbers:', error);
      throw error;
    }
  },

  /**
   * Release a phone number
   * @param {string} twilioSid - The Twilio SID of the phone number
   * @returns {Promise<void>}
   */
  async releasePhoneNumber(twilioSid) {
    try {
      const response = await fetch('/api/twilio/release-number', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          twilioSid,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to release number');
      }
    } catch (error) {
      console.error('Error releasing phone number:', error);
      throw error;
    }
  },
}; 