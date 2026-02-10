import React, {useState} from 'react'
import { elections as dummyElections } from "../data"
import Election from "../components/Election"
import AddElectionModal from '../components/AddElectionModal'
import { useDispatch, useSelector } from 'react-redux'
import { UiActions } from '../store/ui-slice'
import UpdateElectionModal from '../components/UpdateElectionModal'

const Elections = () => {
  const [elections, setElections] = useState(dummyElections)

  const electionModalShowing = useSelector(state => state.ui.electionModalShowing)

  const updateElectionModalShowing = useSelector(state => state.ui.updateElectionModalShowing)

  const dispatch = useDispatch()

  // open add election modal
  const openAddElectionModal = () => {
    dispatch(UiActions.openElectionModal())
  }


  return (
    <>
    <section className='elections'>
      <div className='container elections__container'>
        <header className="elections__header">
          <h1>Ongoing Elections</h1>
          <button className="btn primary" onClick={openAddElectionModal}>
            Create New Election
          </button>
        </header>
        <menu className='election__menu'>
          {
            elections.map(election => <Election key={election.id} {...election}/>)
          }
        </menu>
      </div>
  </section>
  
 { electionModalShowing && <AddElectionModal/>}
 { updateElectionModalShowing && <UpdateElectionModal/>}
    </>
    
  )
}

export default Elections