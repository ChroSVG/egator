import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import ElectionCandidate from '../components/ElectionCandidate'
import { IoAddOutline } from 'react-icons/io5'
import { useDispatch, useSelector } from 'react-redux'
import { UiActions } from '../store/ui-slice'
import AddCandidateModal from '../components/AddCandidateModal'
import { voteActions } from '../store/vote-slice'
import axios from 'axios'
import Loader from '../components/Loader'
import { isDraft } from '@reduxjs/toolkit'
import { useNavigate } from 'react-router-dom'

const ElectionDetails = (props) => {
    const { id } = useParams()
    const dispatch = useDispatch()
    const [isLoading, setIsLoading] = useState(true)
    
    const [election, setElection] = useState([])
    const [candidates, setCandidates] = useState([])
    const [voters, setVoters] = useState([])

    const addCandidateModalShowing = useSelector(state => state.ui.addCandidateModalShowing)
    const token = useSelector(state => state.vote.currentVoter?.token)
    const Navigate = useNavigate()

      // access control
      useEffect(()=>{
        if (!token) {
        Navigate('/login');
      }
      },[token])
    


    const currentVoter = useSelector(state => state.vote.currentVoter)
    const isAdmin = currentVoter?.voter?.isAdmin

    const openModal = () => {
        dispatch(UiActions.openAddCandidateModal())
        dispatch(voteActions.changeAddCandidateElectionId(id))
    }


    const getElectionsData = async () => {
      setIsLoading(true)
      try{
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/elections/${id}`, {
            withCredentials: true,
            headers: {
                Authorization: `Bearer ${token}`
            }
        })

        if(res.status === 200) {
            console.log("Election Data:", res.data.data)
            setElection(res.data.data)
        }
      }
      catch(error) {
        console.error(error)
      }
      finally {
        setIsLoading(false)
      }
    }

    const getCandidatesData = async () => {
      
      try{
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/elections/${id}/candidates`, {
            withCredentials: true,
            headers: {
                Authorization: `Bearer ${token}`
            }
        })

        if(res.status === 200) {
            console.log("Candidates Data:", res.data)
            setCandidates(res.data.data)
        }
      }
      catch(error) {
        console.error(error)
      }
    
    }

    const getVotersData = async () => {
      
      try{
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/elections/${id}/voters`, {
            withCredentials: true,
            headers: {
                Authorization: `Bearer ${token}`
            }
        })

        if(res.status === 200) {
            console.log("Voters Data:", res.data)
            setVoters(res.data.data)
        }
      }
      catch(error) {
        console.error(error)
      }
    
    }


    const deleteElection = async () => {
        try {
            const confirmDelete = window.confirm("Are you sure you want to delete this election?")
            if(!confirmDelete) return
            const res = await axios.delete(`${import.meta.env.VITE_API_URL}/elections/${id}`, {
                withCredentials: true,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            if(res.status === 200) {
                navigate('/elections')
                console.log("Election Deleted")
            }
        }
        catch(error) {
            console.error(error)
        }
    }

    useEffect(() => {
        const fetchData = async () => {
            if (!id || !token) return;
            getElectionsData()
            getCandidatesData()
            getVotersData()
        }

        fetchData()
    }, [id, token, dispatch])

    if (isLoading) {
        return <Loader />
    }

    if (!election) {
        return console.log("Election not found")
    }

    return (
        <>
            <section className="electionDetails">
                <div className="container electionDetails__container">
                    <h2>{election.title}</h2>
                    <p>{election.description}</p>
                    <div className="electionDetails__image">
                        <img src={election.thumbnail} alt={election.title} />
                    </div>
                    <menu className="electionDetails__candidates">
                        {
                            candidates.map(candidate => (
                                <ElectionCandidate key={candidate._id || candidate.id} {...candidate} />
                            ))
                        }
                        {isAdmin &&<button className="add__candidate-btn" onClick={openModal}><IoAddOutline /></button>}
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
                                    voters && voters.length > 0 ? (
                                        voters.map(voter => (
                                            <tr key={voter._id || voter.id}>
                                                <td><h5>{voter.fullName}</h5></td>
                                                <td>{voter.email}</td>
                                                <td>{new Date(voter.createdAt).toLocaleTimeString()}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" style={{ textAlign: 'center' }}>No voters yet.</td>
                                        </tr>
                                    )
                                }
                            </tbody>
                        </table>
                    </menu>
            {isAdmin && <button className='btn danger full' onClick={deleteElection}>Delete Election</button>}
                </div>
            </section>

            {addCandidateModalShowing && <AddCandidateModal />}

        </>
    )
}

export default ElectionDetails