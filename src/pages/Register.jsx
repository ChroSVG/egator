import React, { useState } from 'react'
import { Link } from 'react-router-dom'

const Register = () => {
  const [userData, setUserData] = useState({
    fullName: '',
    email: '',
    password: '',
    password2: ''
  })
  //funtion to change our controlled inputs
  const handleInputChange = (e) => {setUserData(
    prevState => {
      return {...prevState, [e.target.name]:e.target.value}
    }
  )}

  return (
    <section className="register">
      <div className="container register__container">
        <h2>Sign Up</h2>
        <form>
          <p className="form__error-message">Any error from the backend</p>
          <input type="text" name='fullName' placeholder='Full Name' onChange={handleInputChange} autoComplete='true' autoFocus />
          <input type="email" name='email' placeholder='Email Address' onChange={handleInputChange} autoComplete='true'/>
          <input type="password" name='password' placeholder='Password' onChange={handleInputChange} autoComplete='true' />
          <input type="password" name='password2' placeholder='Confirm Password' 
          onChange={handleInputChange} autoComplete='true' />
          <button type='submit' className="btn primary">Register</button>
        </form>
        <p>Already have an account? <Link to='/login'>Sign in</Link></p>
      </div>
    </section>
  )
}

export default Register
