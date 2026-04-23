import React,{useEffect} from 'react'
import { useParams } from 'react-router-dom'
import ElectionCandidate from '../components/ElectionCandidate'
import {IoAddOutline} from 'react-icons/io5'
import { useDispatch, useSelector } from 'react-redux'
import { UiActions } from '../store/ui-slice'
import AddCandidateModal from '../components/AddCandidateModal'
import { voteActions } from '../store/vote-slice'
const ElectionDetails = (props) => {

  
  const {id} = useParams()
  const dispatch = useDispatch()
  console.log("prop",props)
  const addCandidateModalShowing =  useSelector(state => state.ui.addCandidateModalShowing)
  const currentElection = useSelector(state => state.vote.selectedElection)



  const openModal = () => {
    dispatch(UiActions.openAddCandidateModal())
    dispatch(voteActions.changeIdOfElectionToUpdate(id))
  }

  useEffect(() => {
    if (id) {
        dispatch(voteActions.changeIdOfElectionToUpdate(id));
    }
}, [id, dispatch]);


  return (
    <>
    
    <section className="electionDetails">
      <div className="container electionDetails__container">
        <h2>{currentElection.title}</h2>
        <p>{currentElection.description}</p>
        <div className="electionDetails__image">
          <img src={currentElection.thumbnail} alt={currentElection.title} />
        </div>
        <menu className="electionDetails__candidates">
        {
          electionCandidates.map(
            candidate => <ElectionCandidate key={candidate.id}
           {...candidate}/>)
        }
        <button className="add__candidate-btn" onClick={openModal}><IoAddOutline/></button>
      </menu>
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
            {
              voters.map(voter => <tr key={voter.id}>
                <td><h5>{voter.fullName}</h5></td>
                <td>{voter.email}</td>
                <td>14:43:34</td>
              </tr>)
            }
          </tbody>
        </table>
      
      </menu>
    </div>
  </section>



{addCandidateModalShowing && <AddCandidateModal/>}


    </>
  
  )
}

export default ElectionDetails