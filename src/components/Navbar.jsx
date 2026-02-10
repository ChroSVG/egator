import React, { useEffect, useState } from 'react'
import { HiOutlineBars3 } from 'react-icons/hi2'
import { IoIosMoon, IoMdSunny } from 'react-icons/io'
import { AiOutlineClose } from 'react-icons/ai'
import { Link, NavLink } from 'react-router-dom'

const Navbar = () => {
  const [isShowNav, setIsShowNav] = useState(window.innerWidth < 600 ? false:true)
  const [darkTheme, setDarkTheme] = useState(localStorage.getItem('voting-app-theme') || '')

  // function to close nav menu on small screen when menu is clicked
  const handleCloseMenu = () => {
      if(window.innerWidth < 600) {
        setIsShowNav(false);
      } else {
        setIsShowNav(true);
      }

  }
  // function to change/toggle theme
  const handleChangeTheme = () => {
    if(localStorage.getItem('voting-app-theme') == 'dark') {
      localStorage.setItem('voting-app-theme', '')
    
    } else {
      localStorage.setItem('voting-app-theme', 'dark')
    }
    setDarkTheme(localStorage.getItem('voting-app-theme'))
  }

  useEffect(() => {
    document.body.className = localStorage.getItem('voting-app-theme')
  }, [darkTheme])

  return (
    <nav>
      <div className="container nav__container">
        <Link to="/" className="nav__logo">EGATOR</Link>
        <div>
{         isShowNav && <menu>
            <NavLink to="/elections" onClick={handleCloseMenu}>Elections</NavLink>
            
            <NavLink to="/results" onClick={handleCloseMenu}>Result</NavLink>
            
            <NavLink to="/logout" onClick={handleCloseMenu}>Logout</NavLink>
          </menu>}
          <button className="theme__toggle-btn" onClick={handleChangeTheme}>{darkTheme ?<IoMdSunny/>:<IoIosMoon/>}</button>
          <button className="nav__toggle-btn" onClick={() => setIsShowNav(!isShowNav)}>{isShowNav ? <AiOutlineClose/>:<HiOutlineBars3/>}</button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar