import React from 'react';
import ResultElection from '../components/ResultElection';
import { useElections } from '../hooks/useElections';
import Loader from '../components/Loader';

const Result = () => {
    // Using our new custom hook
    const { elections, loading, error } = useElections({ isActive: 'true' });

    if (loading) return <Loader />;
    if (error) return <div className="error-message">Error: {error}</div>;

    return (
        <section className="results">
            <div className="container results__container">
                {elections.length > 0 ? (
                    elections.map(election => (
                        <ResultElection key={election._id} {...election} />
                    ))
                ) : (
                    <p className="no-data">No active elections found.</p>
                )}
            </div>
        </section>
    );
};

export default Result;
