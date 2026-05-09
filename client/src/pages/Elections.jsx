import React, { useEffect } from 'react';
import Election from "../components/Election";
import AddElectionModal from '../components/AddElectionModal';
import { useDispatch, useSelector } from 'react-redux';
import { UiActions } from '../store/ui-slice';
import { voteActions } from '../store/vote-slice';
import UpdateElectionModal from '../components/UpdateElectionModal';
import { useElections } from '../hooks/useElections';
import Loader from '../components/Loader';

const Elections = () => {
    const dispatch = useDispatch();
    const { refreshTrigger } = useSelector(state => state.vote);
    const { electionModalShowing, updateElectionModalShowing } = useSelector(state => state.ui);
    const currentUser = useSelector(state => state.vote.currentVoter);
    const isAdmin = currentUser?.voter?.isAdmin;

    // Use our custom hook for fetching
    const { elections, loading, refresh } = useElections();

    // Sync hook data with Redux store (if still needed by other components)
    useEffect(() => {
        if (elections) {
            dispatch(voteActions.setElections(elections));
        }
    }, [elections, dispatch]);

    // Re-fetch when global refresh is triggered
    useEffect(() => {
        refresh();
    }, [refreshTrigger, refresh]);

    const openAddElectionModal = () => {
        dispatch(UiActions.openElectionModal());
    };

    return (
        <>
            <section className='elections'>
                <div className='container elections__container'>
                    <header className="elections__header">
                        <h1>Ongoing Elections</h1>
                        {isAdmin && (
                            <button className="btn primary" onClick={openAddElectionModal}>
                                Create New Election
                            </button>
                        )}
                    </header>
                    {loading ? (
                        <Loader />
                    ) : (
                        <menu className='election__menu'>
                            {elections.length > 0 ? (
                                elections.map(election => <Election key={election._id} {...election} />)
                            ) : (
                                <p className="no-data">No elections available at the moment.</p>
                            )}
                        </menu>
                    )}
                </div>
            </section>

            {electionModalShowing && <AddElectionModal />}
            {updateElectionModalShowing && <UpdateElectionModal />}
        </>
    );
};

export default Elections;