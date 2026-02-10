import React,{useSelector} from 'react'
import {elections, candidates, voters} from '../data'
import { useParams } from 'react-router-dom'
import ElectionCandidate from '../components/ElectionCandidate'
import {IoAddOutline} from 'react-icons/io5'
import { useDispatch } from 'react-redux'
import { UiActions } from '../store/ui-slice'


const ElectionDetails = () => {
  const {id} = useParams()
  const dispatch = useDispatch()
  const currentElection = elections.find(election => election.id == id)

  const electionCandidates = candidates.filter(candidate => candidate.election == id )


  const addCandidateModalShowing =  useSelector(state => state.ui.addCandidateModalShowing)




  const openModal = () => {
    dispatch(UiActions.openAddCandidateModal())
  }


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