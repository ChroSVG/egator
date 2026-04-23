import React, {useState, useEffect} from 'react';
import {useDispatch, useSelector} from 'react-redux'
import {UiActions} from '../store/ui-slice'
import { voteActions } from '../store/vote-slice'; // 1. Import ini
import axios from 'axios';
import {useNavigate} from "react-router-dom"

const ConfirmVote = ({ selectedElection, token: propToken }) => { // 2. Terima props
  const [modalCandidate, setModalCandidate] = useState({})

  const dispatch = useDispatch()

  // close confirm vote modal
  const closeCandidateModal = () => {
    dispatch(UiActions.closeVoteCandidateModal())
  }

  const navigate = useNavigate()


  // get selected candidate id from redux store
  const selectedCandidateId = useSelector(state => state.vote.selectedVoteCandidate)
  const currentVoter = useSelector(state => state.vote.currentVoter)
  const token = propToken || currentVoter?.token || null // Gunakan prop atau redux

  // get the selected candidate
  const fetchCandidate = async() => {
    const candidate = await axios.get(`${import.meta.env.VITE_API_URL}/candidates/${selectedCandidateId}`, {withCredentials: true, headers: {Authorization: `Bearer ${token}`}})
    setModalCandidate(candidate.data.data)
  }

  const confirmVote = async () => {
    try {
      const response = await axios.patch(
        `${import.meta.env.VITE_API_URL}/candidates/${selectedCandidateId}/vote`, 
        { selectedElectionId: selectedElection }, // 3. Gunakan ID dari props
        { 
          withCredentials: true, 
          headers: { Authorization: `Bearer ${token}` } 
        }
      );

      if (response.status === 200) {
        // 4. Update data voter di Redux agar status 'hasVoted' langsung berubah
        if (response.data.voter) {
          dispatch(voteActions.changeCurrentVoter({
            ...currentVoter,
            votedElections: response.data.voter.votedElections
          }));
        }

        alert("Vote registered successfully!");
        closeCandidateModal();
        navigate('/congrats')
      }
    } catch (error) {
      console.error("Vote failed:", error);
      alert(error.response?.data?.message || "Failed to record vote");
    }
  };




  useEffect(() => {
    fetchCandidate()
  }, [])

  
  return (
    <section className="modal">
      <div className="modal__content confirm__vote-content">
        <h5>Please confirm your vote</h5>
        <div className="confirm__vote-image">
        <img src={modalCandidate.image} alt={modalCandidate.fullName} />
        </div>
        <h2>{modalCandidate.fullName?.length > 17 ? modalCandidate.fullName.substring(0, 17) + '...' : modalCandidate?.fullName}</h2>
        <p>{modalCandidate.motto?.length > 17 ? modalCandidate.motto.substring(0, 17) + '...' : modalCandidate?.motto}</p>
          <div className="confirm__vote-cta">
            <button className="btn" onClick= { closeCandidateModal}>Cancel</button>
            <button className="btn primary" onClick={confirmVote}>Confirm</button>
          </div>
      </div>

    </section>
  )
}

export default ConfirmVote