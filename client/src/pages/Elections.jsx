import React, {useState, useEffect} from 'react'
import Election from "../components/Election"
import AddElectionModal from '../components/AddElectionModal'
import { useDispatch, useSelector } from 'react-redux'
import { UiActions } from '../store/ui-slice'
import UpdateElectionModal from '../components/UpdateElectionModal'
import axios from 'axios'
import Loader from '../components/Loader'
import { useNavigate } from 'react-router-dom'


const Elections = () => {
  const elections = useSelector(state => state.vote.elections)
  const [isLoading, setIsLoading] = useState(true)

  const electionModalShowing = useSelector(state => state.ui.electionModalShowing)
  const refreshTrigger = useSelector(state => state.vote.refreshTrigger)

  const updateElectionModalShowing = useSelector(state => state.ui.updateElectionModalShowing)

  const currentUser = useSelector(state => state.vote.currentVoter)
  const token = currentUser?.token



  const isAdmin = currentUser?.voter?.isAdmin
  const dispatch = useDispatch()
  
  const fetchElections = async() => {
    try{
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/elections`, {withCredentials: true, headers: {Authorization: `Bearer ${token}`}})
      dispatch(voteActions.setElections(response.data.elections))
    } catch(error){
      console.error(error)
    }
    setIsLoading(false)
  }
  
  useEffect(() => {
    fetchElections()
  }, [refreshTrigger])

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
          {isAdmin && <button className="btn primary" onClick={openAddElectionModal}>
            Create New Election
          </button>}
        </header>
        {isLoading ? <Loader/> : <menu className='election__menu'>
          {
            elections.map(election => <Election key={election._id} {...election}/>)
          }
        </menu>}
      </div>
  </section>
  
 { electionModalShowing && <AddElectionModal/>}
 { updateElectionModalShowing && <UpdateElectionModal/>}
    </>
    
  )
}

export default Elections