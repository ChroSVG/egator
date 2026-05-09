import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import API from '../utils/axiosConfig'
const Register = () => {
  const [userData, setUserData] = useState({
    fullName: '',
    email: '',
    password: '',
    password2: ''
  })
  const [error, setError] = useState(null);

  const nagivate = useNavigate();


  //funtion to change our controlled inputs
  const handleInputChange = (e) => {setUserData(
    prevState => {
      return {...prevState, [e.target.name]:e.target.value}
    }
  )}


  
    const registerUser = async (e) => {
        e.preventDefault();
        setError(null);

        // TAMBAHKAN INI: Pengecekan apakah ada field yang kosong
        if (!userData.fullName || !userData.email || !userData.password || !userData.password2) {
          setError("Please fill in all fields."); // Pesan peringatan muncul di sini
          return; // Berhenti di sini, jangan lanjut ke proses axios
        }

        try {
          await API.post('/voters/register', userData);
          nagivate('/');

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
                setError("Connection error with server.");
              }
              
              console.error('Registration failed:', error);
            }
      }
  




  return (
    <section className="register">
      <div className="container register__container">
        <h2>Sign Up</h2>
        <form onSubmit={registerUser}>
          {error && <p className="form__error-message">{error}</p>}
          <input type="text" name='fullName' placeholder='Full Name' onChange={handleInputChange} autoComplete='true' autoFocus value={userData.fullName} />
          <input type="email" name='email' placeholder='Email Address' onChange={handleInputChange} autoComplete='true' value={userData.email} />
          <input type="password" name='password' placeholder='Password' onChange={handleInputChange} autoComplete='true' value={userData.password} />
          <input type="password" name='password2' placeholder='Confirm Password' 
          onChange={handleInputChange} autoComplete='true' value={userData.password2} />
          <button type='submit' className="btn primary">Register</button>
        </form>
        <p>Already have an account? <Link to='/login'>Sign in</Link></p>
      </div>
    </section>
  )
}

export default Register
