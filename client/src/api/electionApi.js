import axios from './axiosConfig';

/**
 * Election API Services
 */
export const getElections = async (params = {}) => {
    const response = await axios.get('/elections', { params });
    return response.data;
};

export const getElectionById = async (id, includeCandidates = true) => {
    const response = await axios.get(`/elections/${id}`, {
        params: { includeCandidates }
    });
    return response.data;
};

export const createElection = async (formData) => {
    const response = await axios.post('/elections', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const updateElection = async (id, formData) => {
    const response = await axios.patch(`/elections/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const deleteElection = async (id) => {
    const response = await axios.delete(`/elections/${id}`);
    return response.data;
};

export const getElectionResults = async (id) => {
    const response = await axios.get(`/elections/${id}/results`);
    return response.data;
};
