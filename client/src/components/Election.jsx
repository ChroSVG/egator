import React from 'react'
import { Link } from 'react-router-dom'
 import { useDispatch } from 'react-redux'
 import { UiActions } from '../store/ui-slice'
import { voteActions } from '../store/vote-slice' // Import ini

const Election = ({_id:id, title, description, thumbnail}) => {
    
    const dispatch = useDispatch()

    // open update election modal
    const openUpdateModal = () => {
        dispatch(voteActions.changeIdOfElectionToUpdate(id)) // ISI ID DISINI
        dispatch(UiActions.openUpdateElectionModal())
    }
  
  return (
    <article className="election">
        <div className="election__image">
            <img src={thumbnail} alt={title} />
        </div>
        <div className="election__info">
            <Link to={`/elections/${id}`}><h4>{title}</h4></Link>
            <p>{description?.length > 255 ? description.substring(0, 255) + '...' : description}</p>
            <div className="election__cta">
                <Link to={`/elections/${id}`} className="btn sm">View</Link>
                <button className="btn sm primary" onClick={openUpdateModal}>
                    Edit
                </button>
            </div>
        </div>
    </article>   

)
}

export default Election