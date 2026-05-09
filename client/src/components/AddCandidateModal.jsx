import React, { useState } from 'react';
import { IoMdClose } from 'react-icons/io';
import { useDispatch, useSelector } from 'react-redux';
import { UiActions } from '../store/ui-slice';
import { voteActions } from '../store/vote-slice';
import * as candidateApi from '../api/candidateApi';

const AddCandidateModal = () => {
    const [fullName, setFullName] = useState("");
    const [motto, setMotto] = useState("");
    const [image, setImage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const electionId = useSelector(state => state.vote.addCandidateElectionId);
    const dispatch = useDispatch();

    const closeAddCandidateModal = () => {
        dispatch(UiActions.closeAddCandidateModal());
    };

    const handleAddCandidate = async (e) => {
        e.preventDefault();
        
        if (!fullName || !motto || !image || !electionId) {
            alert("Please fill all fields and ensure an election is selected.");
            return;
        }

        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('fullName', fullName);
            formData.append('motto', motto);
            formData.append('image', image);
            
            // Using modular API service
            await candidateApi.addCandidateToElection('new', electionId, formData);

            alert("Candidate added successfully!");
            dispatch(voteActions.triggerRefresh());
            closeAddCandidateModal();
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Failed to add candidate";
            alert("Error: " + errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="modal">
            <div className="modal__content">
                <header className="modal__header">
                    <h4>Add Candidate</h4>
                    <button className="modal__close" onClick={closeAddCandidateModal}><IoMdClose /></button>
                </header>
                <form onSubmit={handleAddCandidate}>
                    <div>
                        <h6>Candidate Name:</h6>
                        <input type="text" name='fullName' value={fullName} onChange={e => setFullName(e.target.value)} required />
                    </div>
                    <div>
                        <h6>Candidate Motto:</h6>
                        <input type="text" name='motto' value={motto} onChange={e => setMotto(e.target.value)} required />
                    </div>
                    <div>
                        <h6>Candidate Image:</h6>
                        <input type="file" name='image' onChange={e => setImage(e.target.files[0])} accept="image/*" required />
                    </div>
                    <button type="submit" className="btn primary" disabled={isSubmitting}>
                        {isSubmitting ? 'Adding...' : 'Add Candidate'}
                    </button>
                </form>
            </div>
        </section>
    );
};

export default AddCandidateModal;