import axios from 'axios';
import { log } from '../utils/logger.js';

let currentToken = null;

/**
 * Retrieves a valid guest JWT from TXLine.
 * If the current token is missing, it makes a POST request to obtain a new one.
 */
export async function getValidToken() {
  if (currentToken) {
    return currentToken;
  }

  log.info("auth", "Fetching new TXLine guest token...");
  try {
    const res = await axios.post('https://txline.txodds.com/auth/guest/start', {}, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    currentToken = res.data.token;
    log.info("auth", "Successfully retrieved new TXLine guest token.");
    return currentToken;
  } catch (error) {
    log.error("auth", `Failed to get TXLine guest token: ${error.message}`);
    if (error.response) {
      log.error("auth", `Response status: ${error.response.status}`);
    }
    throw error;
  }
}

/**
 * Forces a refresh of the token (e.g. if we receive a 401 Unauthorized later).
 */
export async function refreshToken() {
  currentToken = null;
  return await getValidToken();
}
