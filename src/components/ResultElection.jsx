import {React, useState} from "react"
import CandidateRating from "../components/CandidateRating"
import {candidates} from "../data.js"
import { Link } from 'react-router-dom'

const ResultElection = ({id, thumbnail, title}) => {
    const [totalVotes, setTotalVotes] = useState(521)
    
    // get candidate that to this election intration
    const electionCandidates = candidates.filter(candidate => {
        return candidate.election === id
    })
    return (
       <section className="result">
        <header className="result__header">
            <h4>{title}</h4>
            <div className="result__header-image">
                <img src={thumbnail} alt={title} />
            </div>
        </header>
        <ul className="result__list">
                    {
                        electionCandidates.map(candidate => <CandidateRating key={candidate.id} {...candidate} totalVotes={totalVotes}/>)
                    }
                </ul>
            <Link to={`/elections/${id}/candidates`} className="btn primary full">View Candidates</Link>
       </section>
        )
    
}

export default ResultElection