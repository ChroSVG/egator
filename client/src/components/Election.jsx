import React from 'react'
import { Link } from 'react-router-dom'
 import { useDispatch } from 'react-redux'
 import { UiActions } from '../store/ui-slice'


const Election = ({id, title, description, thumbnail}) => {
    
    
    
    const dispatch = useDispatch()

    //   open update election modal
    const openUpdateModal = () => {
        dispatch(UiActions.openUpdateElectionModal(id, title, description, thumbnail))
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