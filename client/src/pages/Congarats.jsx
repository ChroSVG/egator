import React from 'react'
import {Link} from 'react-router-dom'

const Congarats = () => {
  return (
    <section className='congrats'>
      <div className='container congrats__container'>
        <h2>Thanks for your vote!</h2>
        <p>Your vote is now added to your candidate's vote count. You will be redirected shortly to see the new result.</p>
        <Link to = '/results' className='btn sm primary'> Go to results </Link>
      </div>
    </section>
  )
}

export default Congarats