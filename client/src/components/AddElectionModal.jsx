import React, { useState } from 'react';
import { IoMdClose } from 'react-icons/io';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { UiActions } from '../store/ui-slice';
import { voteActions } from '../store/vote-slice';
import * as electionApi from '../api/electionApi';

const AddElectionModal = () => {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [thumbnail, setThumbnail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const closeAddElectionModal = () => {
        dispatch(UiActions.closeElectionModal());
    };

    const handleCreateElection = async (e) => {
        e.preventDefault();

        if (!title || !description || !thumbnail) {
            alert("Please fill all fields and select a thumbnail image.");
            return;
        }

        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('thumbnail', thumbnail);

            await electionApi.createElection(formData);

            alert("Election created successfully!");
            closeAddElectionModal();
            dispatch(voteActions.triggerRefresh());
            navigate(`/elections`);
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Failed to create election";
            alert("Error: " + errorMsg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="modal">
            <div className="modal__content">
                <header className="modal__header">
                    <h4>Create New Election</h4>
                    <button className="modal__close" onClick={closeAddElectionModal}><IoMdClose /></button>
                </header>
                <form onSubmit={handleCreateElection}>
                    <div>
                        <h6>Election Title:</h6>
                        <input type="text" value={title} onChange={e => setTitle(e.target.value)} name='title' required />
                    </div>
                    <div>
                        <h6>Election Description: </h6>
                        <input type="text" value={description} onChange={e => setDescription(e.target.value)} name="description" required />
                    </div>
                    <div>
                        <h6>Election Thumbnail:</h6>
                        <input type="file" onChange={e => setThumbnail(e.target.files[0])} name="thumbnail" accept="image/*" required />
                    </div>
                    <button type="submit" className="btn primary" disabled={isSubmitting}>
                        {isSubmitting ? "Creating..." : "Add Election"}
                    </button>
                </form>
            </div>
        </section>
    );
};

export default AddElectionModal;