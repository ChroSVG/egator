import { useState, useEffect, useCallback } from "react";
import CandidateRating from "../components/CandidateRating";
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from "react-redux";
import Loader from "./Loader";
const ResultElection = ({ _id: id, thumbnail, title }) => {
    const [totalVotes, setTotalVotes] = useState(0);
    const [electionCandidates, setElectionCandidates] = useState([]);
    
    const [isLoading, setIsLoading] = useState(false);

    const token = useSelector(state => state?.vote?.currentVoter?.token);

    // Gunakan useCallback agar fungsi tidak dibuat ulang setiap render (opsional tapi bagus)
    const getCandidates = useCallback(async () => {
        if (!id || !token) return;
        
        setIsLoading(true);

        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/elections/${id}/candidates`, {
                withCredentials: true,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            const candidates = response.data;
            setElectionCandidates(candidates);


            // cara lama: hitung total suara dengan loop (kurang efisien dan bisa menyebabkan bug jika tidak hati-hati)
            // for (let i = 0; i < candidates.length; i++) {
            //     setTotalVotes(prevTotal => prevTotal + candidates[i].voteCount);
            // }



            // Hitung total secara aman
            const total = candidates.reduce((acc, candidate) => acc + (candidate.voteCount || 0), 0);
            setTotalVotes(total);

        } catch (error) {
            console.error('Error fetching candidates:', error);
        }

        setIsLoading(false);
    }, [id, token]);

    useEffect(() => {
        getCandidates();
    }, [getCandidates]);

    return (
        <>
        {isLoading && < Loader />}
        
        <section className="result">
            <header className="result__header">
                <h4>{title}</h4>
                <div className="result__header-image">
                    {/* Tambahkan fallback jika thumbnail kosong */}
                    <img src={thumbnail} alt={title} />
                </div>
            </header>
            
            <ul className="result__list">
                {electionCandidates.length > 0 ? (
                    electionCandidates.map(candidate => (
                        <CandidateRating 
                            key={candidate._id || candidate.id} 
                            {...candidate} 
                            totalVotes={totalVotes}
                        />
                    ))
                ) : (
                    <p>No candidates found </p>
                )}
            </ul>
            
            <Link to={`/elections/${id}/candidates`} className="btn primary full">
                View Candidates
            </Link>
        </section>
        </>
    );
}

export default ResultElection;