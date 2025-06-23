import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';

dotenv.config();

class PinataService {
  constructor() {
    this.apiKey = process.env.PINATA_API_KEY;
    this.secretApiKey = process.env.PINATA_SECRET_API_KEY;
    this.jwt = process.env.PINATA_JWT;    this.baseURL = 'https://api.pinata.cloud';
  }

  /**
   * Upload JSON data to IPFS via Pinata
   * @param {Object} jsonData - The JSON data to upload
   * @param {string} fileName - Name for the file
   * @param {Object} metadata - Optional metadata
   * @returns {Promise<Object>} - Upload result with CID
   */  async uploadJSON(jsonData, fileName = 'user-data.json', metadata = {}) {
    try {
      const url = `${this.baseURL}/pinning/pinJSONToIPFS`;
      
      const body = {
        pinataContent: jsonData,
        pinataMetadata: {
          name: fileName,
          keyvalues: {
            userDataExport: 'true',
            timestamp: new Date().toISOString(),
            ...metadata
          }
        },
        pinataOptions: {
          cidVersion: 1
        }
      };

      const response = await axios.post(url, body, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.jwt}`
        }
      });      if (response.data && response.data.IpfsHash) {
        return {
          success: true,
          cid: response.data.IpfsHash,
          pinSize: response.data.PinSize,
          timestamp: response.data.Timestamp,
          ipfsUrl: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`,
          publicUrl: `https://${response.data.IpfsHash}.ipfs.dweb.link/`
        };
      } else {
        throw new Error('Invalid response from Pinata');
      }
    } catch (error) {
      console.error('Error uploading to Pinata:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Get file info from Pinata
   * @param {string} cid - The IPFS CID
   * @returns {Promise<Object>} - File information
   */
  async getFileInfo(cid) {
    try {
      const url = `${this.baseURL}/data/pinList?hashContains=${cid}`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.jwt}`
        }
      });

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('❌ Error getting file info from Pinata:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test Pinata connection
   * @returns {Promise<boolean>} - Connection status
   */
  async testConnection() {
    try {
      const url = `${this.baseURL}/data/testAuthentication`;
      
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.jwt}`
        }
      });

      console.log('✅ Pinata connection test successful:', response.data);
      return true;
    } catch (error) {
      console.error('❌ Pinata connection test failed:', error.message);
      return false;
    }
  }
}

export default new PinataService();
