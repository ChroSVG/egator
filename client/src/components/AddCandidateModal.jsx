import React, { useState } from 'react'
import {IoMdClose} from 'react-icons/io'
import { useDispatch, useSelector } from 'react-redux'
import { UiActions } from '../store/ui-slice'
import API from '../utils/axiosConfig'
import { voteActions } from '../store/vote-slice'

const AddCandidateModal = () => { // 1. Terima electionId sebagai prop
    const [fullName, setFullName] = useState("")
    const [motto, setMotto] = useState("")
    const [image, setImage] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const currentUser = useSelector(state => state.vote.currentVoter)
    const token = currentUser?.token
    const electionId = useSelector(state => state.vote.addCandidateElectionId)

    const dispatch = useDispatch()
    const closeAddCandidateModal = () => {
        dispatch(UiActions.closeAddCandidateModal())
    }

    const handleAddCandidate = async (e) => {
        e.preventDefault()
        
        if (!fullName || !motto || !image || !electionId) {
            alert("Please fill all fields and ensure an election is selected.");
            return;
        }

        setIsSubmitting(true)

        try {
            const data = new FormData()
            data.append('fullName', fullName)
            data.append('motto', motto)
            data.append('image', image)
            data.append('electionId', electionId)            
            
            // 2. Kirim electionId ke backend
            const response = await API.post(`/candidates/elections/${electionId}`, data)

            if (response.status === 201) {
                alert("Candidate added successfully!");
                dispatch(voteActions.triggerRefresh());
                closeAddCandidateModal();
            }
        } catch (error) {
            console.error("Add Candidate Error:", error)
            alert("Failed to add candidate: " + (error.response?.data?.message || error.message))
        } finally {
            setIsSubmitting(false)
        }
    }


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
                    <input type="text" name='fullName' onChange={e=> setFullName(e.target.value)}/>
                </div>
                <div>
                    <h6>Candidate Motto:</h6>
                    <input type="text" name='motto' onChange={e=> setMotto(e.target.value)}/>
                </div>
                <div>
                    <h6>Candidate Image:</h6>
                    <input type="file" name='image' onChange={e=> setImage(e.target.files[0])} accept=".jpg,.jpeg,.png,.gif,.bmp,.svg,.webp"/>
                </div>
                <button type="submit" className="btn primary" disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add Candidate'}</button>
            </form>
        </div>
    </section>

  


)

}

export default AddCandidateModal