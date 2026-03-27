import { useState, useEffect } from 'react'
// import { elections as dummyElections}  from '../data'

import ResultElection from '../components/ResultElection'
import axios from 'axios'
import { useSelector } from 'react-redux'
const Result = () => {
  const [elections, setElections] = useState([]);
  const token = useSelector(state => state?.vote?.currentVoter?.token);

  const fetchElections = async () => {
      if (!token) {
        console.log('fetchElections skipped: token not available');
        return;
      }

      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/elections`, {
          withCredentials: true,
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        console.log('API Response:', response.data);

        // Axios sudah mem-parse JSON secara otomatis, langsung ambil .data
        const electionsData = response.data.elections || [];
        console.log('Elections data:', electionsData);
        
        setElections(electionsData);
      } catch (error) {
        console.error('Error fetching elections:', error);
        console.error('Error status:', error?.status);
        console.error('Error response:', error?.response?.data);
        // Tips: Jika error 401 (Unauthorized), kamu bisa arahkan user ke login
        }
      };

      useEffect(() => {
        fetchElections();
      }, [token]); // Re-fetch jika token berubah atau baru tersedia







  return (
    <section className="results">
      <div className="container results__container">
        {console.log('Rendering elections:', elections)}
        {
          elections.map(election => {
            console.log('Rendering election:', election);
            return <ResultElection key={election._id} {...election}/>
          })
        }
      </div>
    </section>
  )
}

export default Result   
