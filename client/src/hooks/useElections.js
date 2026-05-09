import { useState, useEffect, useCallback } from 'react';
import * as electionApi from '../api/electionApi';

/**
 * Custom Hook: useElections
 */
export const useElections = (params = {}) => {
    const [elections, setElections] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchElections = useCallback(async () => {
        try {
            setLoading(true);
            const response = await electionApi.getElections(params);
            setElections(response.data);
            setPagination(response.pagination);
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch elections');
        } finally {
            setLoading(false);
        }
    }, [JSON.stringify(params)]);

    useEffect(() => {
        fetchElections();
    }, [fetchElections]);

    return { elections, pagination, loading, error, refresh: fetchElections };
};

/**
 * Custom Hook: useElectionData
 * 
 * Comprehensive hook for election details including candidates and voters.
 */
export const useElectionData = (id) => {
    const [data, setData] = useState({
        election: null,
        candidates: [],
        voters: []
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchData = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            // Fetch everything in parallel
            const [electionRes, candidatesRes, votersRes] = await Promise.all([
                electionApi.getElectionById(id),
                axiosGet(`/elections/${id}/candidates`), // Fallback for specific endpoints
                axiosGet(`/elections/${id}/voters`)
            ]);

            setData({
                election: electionRes.data,
                candidates: candidatesRes.data || [],
                voters: votersRes.data || []
            });
            setError(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return { ...data, loading, error, refresh: fetchData };
};

// Helper for internal use in hooks
async function axiosGet(url) {
    const axios = (await import('../api/axiosConfig')).default;
    const response = await axios.get(url);
    return response.data;
}
