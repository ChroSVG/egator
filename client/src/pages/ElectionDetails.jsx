import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { IoAddOutline } from 'react-icons/io5';
import { useDispatch, useSelector } from 'react-redux';
import { UiActions } from '../store/ui-slice';
import { voteActions } from '../store/vote-slice';
import AddCandidateModal from '../components/AddCandidateModal';
import ElectionCandidate from '../components/ElectionCandidate';
import VoterTable from '../components/VoterTable';
import Loader from '../components/Loader';
import { useElectionData } from '../hooks/useElections';
import * as electionApi from '../api/electionApi';

const ElectionDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    
    const { addCandidateModalShowing } = useSelector(state => state.ui);
    const { currentVoter, refreshTrigger } = useSelector(state => state.vote);
    const isAdmin = currentVoter?.voter?.isAdmin;

    // Use our comprehensive custom hook
    const { election, candidates, voters, loading, error, refresh } = useElectionData(id);

    useEffect(() => {
        refresh();
    }, [refreshTrigger, refresh]);

    const openModal = () => {
        dispatch(UiActions.openAddCandidateModal());
        dispatch(voteActions.changeAddCandidateElectionId(id));
    };

    const handleDeleteElection = async () => {
        if (!window.confirm("Are you sure you want to delete this election?")) return;
        
        try {
            await electionApi.deleteElection(id);
            navigate('/elections');
        } catch (err) {
            alert(err.response?.data?.message || "Failed to delete election");
        }
    };

    if (loading) return <Loader />;
    if (error) return <div className="error-message">{error}</div>;
    if (!election) return <div className="no-data">Election not found.</div>;

    return (
        <>
            <section className="electionDetails">
                <div className="container electionDetails__container">
                    <h2>{election.title}</h2>
                    <p>{election.description}</p>
                    <div className="electionDetails__image">
                        <img src={election.thumbnail} alt={election.title} />
                    </div>

                    <menu className="electionDetails__candidates">
                        {candidates.map(candidate => (
                            <ElectionCandidate key={candidate._id} {...candidate} />
                        ))}
                        {isAdmin && (
                            <button className="add__candidate-btn" onClick={openModal}>
                                <IoAddOutline />
                            </button>
                        )}
                    </menu>

                    {/* Modularized Voter Table */}
                    <VoterTable voters={voters} />

                    {isAdmin && (
                        <button className='btn danger full' onClick={handleDeleteElection}>
                            Delete Election
                        </button>
                    )}
                </div>
            </section>

            {addCandidateModalShowing && <AddCandidateModal />}
        </>
    );
};

export default ElectionDetails;