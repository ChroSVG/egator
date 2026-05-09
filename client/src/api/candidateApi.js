import axios from './axiosConfig';

/**
 * Candidate API Services
 */
export const getCandidates = async () => {
    const response = await axios.get('/candidates');
    return response.data;
};

export const getCandidateById = async (id) => {
    const response = await axios.get(`/candidates/${id}`);
    return response.data;
};

export const createCandidate = async (formData) => {
    const response = await axios.post('/candidates', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const updateCandidate = async (id, formData) => {
    const response = await axios.patch(`/candidates/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const deleteCandidate = async (id) => {
    const response = await axios.delete(`/candidates/${id}`);
    return response.data;
};

export const voteForCandidate = async (id, electionId, idempotencyKey) => {
    const response = await axios.patch(`/candidates/${id}/vote`, 
        { selectedElectionId: electionId },
        { 
            headers: { 'X-Idempotency-Key': idempotencyKey }
        }
    );
    return response.data;
};

export const addCandidateToElection = async (candidateId, electionId, formData = null) => {
    // If candidateId is 'new', we are creating a new candidate directly into the election
    const url = candidateId === 'new' 
        ? `/candidates/elections/${electionId}`
        : `/candidates/${candidateId}/elections/${electionId}`;
        
    const response = await axios.post(url, formData, {
        headers: formData ? { 'Content-Type': 'multipart/form-data' } : {}
    });
    return response.data;
};
