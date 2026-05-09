import React from 'react'
import {IoMdTrash} from 'react-icons/io'
import axios from 'axios'
import { useSelector, useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { voteActions } from '../store/vote-slice'

const ElectionCandidate = ({fullName, image, motto, _id:id}) => {


  const token = useSelector(state => state.vote?.currentVoter?.token)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  
  const deleteCandidate = async () => {
    try {
      const res = await axios.delete(`${import.meta.env.VITE_API_URL}/candidates/${id}`, {withCredentials:true, headers: {Authorization: `Bearer ${token}`}})
      if(res.status === 200) {
        alert("Candidate deleted successfully")
        dispatch(voteActions.triggerRefresh())
      }
    } catch (error) {
      console.log(error)
      const errorMsg = error.response?.data?.message || error.message;
      alert("Error: " + errorMsg);
    }
  }  


  return (
    <li className="electionCandidate">
      <div className="electionCandidate__image">
        <img src={image} alt={fullName}/>
    </div>
    <div>
        <h5>{fullName}</h5>
        <small>{motto?.length > 70 ?motto.substring(0, 70) + "..." : motto}</small>
        <button className="electionCandidate__btn" onClick={deleteCandidate}><IoMdTrash/></button>
    </div>
    </li>
  )
}

export default ElectionCandidate