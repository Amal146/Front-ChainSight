// src/services/authService.js
import axios from 'axios';

const API_URL = "https://back-chainsight-1.onrender.com/api/auth"; // replace with your actual backend base URL

const register = (username, email, password, walletAddress, blockchainType) => {
  return axios.post(`${API_URL}/register`, {
    username,
    email,
    password,
    walletAddress,
    blockchainType
  });
};

const login = (email, password) => {
  return axios.post(`${API_URL}/login`, {
    email,
    password
  });
};

export default {
  register,
  login
};
