import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

/**
 * A wrapper component to protect routes that require authentication.
 * If the user is not logged in, it redirects them to the login page.
 */
const ProtectedRoute = ({ children }) => {
    const token = useSelector(state => state.vote.currentVoter?.token);
    const navigate = useNavigate();

    useEffect(() => {
        if (!token) {
            navigate('/login');
        }
    }, [token, navigate]);

    // If there's a token, render the protected component
    return token ? children : null;
};

export default ProtectedRoute;
