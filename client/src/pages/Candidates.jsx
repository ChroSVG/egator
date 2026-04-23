import React, { useState,useEffect} from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Candidate from '../components/Candidate'
import ConfirmVote from '../components/ConfirmVote'
import axios from 'axios';

const Candidates = () => {
  const { id: selectedElection } = useParams();
  const [candidates, setCandidates] = useState([]);
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentVoter = useSelector(state => state?.vote?.currentVoter);
  const token = currentVoter?.token;
  
  // Check if user has already voted in this election
  const hasVoted = currentVoter?.votedElections?.includes(selectedElection);

  const voteCandidateModalShowing = useSelector(state => state.ui.voteCandidateModalShowing);

  const fetchData = async () => {
    try {
      setLoading(true);
      // 1. Fetch Election details
      const electionRes = await axios.get(`${import.meta.env.VITE_API_URL}/elections/${selectedElection}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setElection(electionRes.data);

      // 2. Fetch Candidates
      const candidatesRes = await axios.get(`${import.meta.env.VITE_API_URL}/elections/${selectedElection}/candidates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCandidates(candidatesRes.data.data || candidatesRes.data);
      
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedElection && token) {
      fetchData();
    }
  }, [selectedElection, token, hasVoted]);

  if (loading) return <div className="container" style={{padding: '2rem'}}>Loading...</div>;

  return (
    <>
      <section className='candidates'>
        <header className='candidates__header'>
          {hasVoted ? (
            <div className="voted-badge" style={{background: '#d4edda', color: '#155724', padding: '0.5rem 1rem', borderRadius: '4px', marginBottom: '1rem', display: 'inline-block', fontWeight: 'bold'}}>
              ✅ You have already voted
            </div>
          ) : (
            <div className="not-voted-badge" style={{background: '#fff3cd', color: '#856404', padding: '0.5rem 1rem', borderRadius: '4px', marginBottom: '1rem', display: 'inline-block', fontWeight: 'bold'}}>
              🗳️ You haven't voted yet
            </div>
          )}

          <h1>{hasVoted ? 'Election Results' : 'Vote for your candidate'}</h1>
          <p>
            These are the candidates for the <strong>{election?.title || 'this election'}</strong>. 
            {hasVoted 
              ? " Thank you for participating! Your vote has been recorded." 
              : " Please vote once and wisely, because you won't be allowed to vote in this election again."
            }
          </p>
        </header>
        <div className="container candidates__container">
          {candidates.length > 0 ? (
            candidates.map(candidate => (
              <Candidate 
                key={candidate._id} 
                {...candidate} 
                hasVoted={hasVoted}
              />
            ))
          ) : (
            <p>No candidates found for this election.</p>
          )}
        </div>
      </section>

      { !hasVoted && voteCandidateModalShowing && <ConfirmVote selectedElection={selectedElection} token={token}/> }
    </>
  );
}

export default Candidates;
