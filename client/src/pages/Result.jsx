import { useState, useEffect } from 'react'
// import { elections as dummyElections}  from '../data'

import ResultElection from '../components/ResultElection'
import axios from 'axios'
import { useSelector } from 'react-redux'
const Result = () => {
  const [elections, setElections] = useState([]);
  const token = useSelector(state => state?.vote?.currentVoter?.token);

  const fetchElections = async () => {
      if (!token) return; // Jangan panggil API jika tidak ada token

      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/elections`, {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        // Axios sudah mem-parse JSON secara otomatis, langsung ambil .data
        setElections(response.data.elections); 
      } catch (error) {
        console.error('Error fetching elections:', error);
        // Tips: Jika error 401 (Unauthorized), kamu bisa arahkan user ke login
        }
      };

      useEffect(() => {
        fetchElections();
      }, [token]); // Re-fetch jika token berubah atau baru tersedia







  return (
    <section className="results">
      <div className="container results__container">
        {
          elections.map(election => <ResultElection key={election._id} {...election}/>)
        }
      </div>
    </section>
  )
}

export default Result   
