import React from 'react';

/**
 * VoterTable Component
 * 
 * Modular component to display the list of voters.
 */
const VoterTable = ({ voters }) => {
    return (
        <menu className='voters'>
            <h2>Voters</h2>
            <table className="voters__table">
                <thead>
                    <tr>
                        <th>Full Name</th>
                        <th>Email Address</th>
                        <th>Time</th>
                    </tr>
                </thead>
                <tbody>
                    {voters && voters.length > 0 ? (
                        voters.map(voter => (
                            <tr key={voter._id || voter.id}>
                                <td><h5>{voter.fullName}</h5></td>
                                <td>{voter.email}</td>
                                <td>{voter.createdAt ? new Date(voter.createdAt).toLocaleTimeString() : 'N/A'}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="3" style={{ textAlign: 'center' }}>No voters yet.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </menu>
    );
};

export default VoterTable;
