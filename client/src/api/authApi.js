import axios from './axiosConfig';

/**
 * Auth API Services
 */
export const login = async (credentials) => {
    const response = await axios.post('/voters/login', credentials);
    return response.data;
};

export const register = async (userData) => {
    const response = await axios.post('/voters/register', userData);
    return response.data;
};

export const getProfile = async (id) => {
    const response = await axios.get(`/voters/${id}`);
    return response.data;
};
