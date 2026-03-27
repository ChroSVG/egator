import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useDispatch } from 'react-redux'
import { voteActions } from '../store/vote-slice'
const Login = () => {
  const [userData, setUserData] = useState({
    email: '',
    password: '',
  })

  const [error, setError] = useState(null);

  const dispatch = useDispatch();

  const navigate = useNavigate();

  //funtion to change our controlled inputs
  const handleInputChange = (e) => {setUserData(
    prevState => {
      return {...prevState, [e.target.name]:e.target.value}
    }
  )}
  

  const loginUser = async (e) => {
        e.preventDefault();
        setError(null);

        // TAMBAHKAN INI: Pengecekan apakah ada field yang kosong
        if (!userData.email || !userData.password) {
          setError("Please fill in all fields."); // Pesan peringatan muncul di sini
          return; // Berhenti di sini, jangan lanjut ke proses axios
        }

        try {
          const response = await axios.post(`${import.meta.env.VITE_API_URL}/voters/login`, userData);

          const newVoter = await response.data;
          // Simpan data voter ke localStorage
          localStorage.setItem('currentUser', JSON.stringify(newVoter));
          // Update state global dengan data voter yang baru
          dispatch(voteActions.changeCurrentVoter(newVoter));
          // Redirect atau lakukan tindakan lain setelah login berhasil
          navigate('/results');




        } catch (error) {
              // 1. Cek apakah ada error dari express-validator (array errors)
              if (error.response?.data?.errors && error.response.data.errors.length > 0) {
                // Ambil pesan dari error pertama yang ditemukan
                setError(error.response.data.errors[0].message); 
              } 
              // 2. Jika tidak ada array errors, cek pesan message biasa
              else if (error.response?.data?.message) {
                setError(error.response.data.message);
              } 
              // 3. Jika server mati atau koneksi gagal
              else {
                setError("Terjadi kesalahan koneksi ke server.");
              }
              
              console.error('Login failed:', error);
            }
      }
  



  return (
    <section className="register">
      <div className="container register__container">
        <h2>Sign in</h2>
        <form onSubmit={loginUser} >
          {error && <p className="form__error-message">{error}</p>}
          <input type="email" name='email' placeholder='Email Address' onChange={handleInputChange} autoComplete='true' autoFocus value={userData.email} />
          <input type="password" name='password' placeholder='Password' onChange={handleInputChange} autoComplete='true' value={userData.password} />
          <button type='submit' className="btn primary">Login</button>
        </form>
        <p>Already have an account? <Link to='/register'>Sign up</Link></p>
      </div>
    </section>)
}

export default Login