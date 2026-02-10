import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Image from '../assets/404.gif'
 
const ErrorPage = () => {
  const navigate = useNavigate()
  // redirect user to preivous page after 6 seconds
  useEffect(() => {
    setTimeout(() => {
      navigate(-1)
    }, 6000)
  })

  return (
    <section className=" errorPage">
      <div className="errorPage__container">
        <img src={Image} alt="Page not found" />
        <h1>404</h1>
        <p>Page not found</p>
      </div>
    </section>
  
  )
}

export default ErrorPage