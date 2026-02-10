import React from 'react'
import { Link } from 'react-router-dom'
 


const Election = ({id, title, description, thumbnail}) => {
  
  
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
                <button className="btn sm primary">
                    Edit
                </button>
            </div>
        </div>
    </article>   

)
}

export default Election