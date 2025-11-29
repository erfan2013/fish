// src/apiClient.js
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:4000';

async function callApi(path, options = {}, retries = 2) {
  const url = `${API_BASE}${path}`;

  try {
    const response = await axios({
      url,
      method: options.method || 'GET',
      data: options.data || undefined,
      headers: options.headers || undefined,
      timeout: 15000, // ۱۵ ثانیه، که اگر سرور تازه بیدار می‌شه، فرصت داشته باشه
    });
    return response;
  } catch (err) {
    // اگر سرور خواب بود یا timeout شد، اینجا می‌آد
    if (retries > 0) {
      console.warn('Server might be waking up, retrying...', retries);
      // چند ثانیه صبر
      await new Promise((res) => setTimeout(res, 5000));
      return callApi(path, options, retries - 1);
    }
    throw err;
  }
}

export { API_BASE, callApi };
