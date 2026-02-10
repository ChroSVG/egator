import React from 'react';
import { useParams } from 'react-router-dom';
import { candidates, elections } from '../data'; // Import data
import { useSelector } from 'react-redux';
import Candidate from '../components/Candidate'
import ConfirmVote from '../components/ConfirmVote'


const Candidates = () => {
  const { id } = useParams();

  const voteCandidateModalShowing = useSelector(state => state.ui.voteCandidateModalShowing)

  const election = elections.find(e => e.id === id);
  const electionCandidates = candidates.filter(c => c.election === id);

  return (
    <>
      <section className='candidates'>
      <header className='candidates__header'>
        <h1>Vote for your candidate</h1>
        <p>These are the candidates for the {election?.title}. Please vote once and wisely, because you won't be allowed to vote in this election again.</p>
      </header>
      <div className="container candidates__container">
        {electionCandidates.map(candidate => <Candidate key={candidate.id} {...candidate}/>)
        }
      </div>
    </section>
  

      { voteCandidateModalShowing && <ConfirmVote/> }
    </>
    );
}

export default Candidates;
