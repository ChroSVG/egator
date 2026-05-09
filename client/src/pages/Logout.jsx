import React, { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom';
import { voteActions } from '../store/vote-slice';

const Logout = () => {
  
  const dispatch = useDispatch();
  const navigate = useNavigate();




  useEffect(
    ()=>{
      // Dispatch logout action untuk menghapus data dari Redux store
      dispatch(voteActions.logoutVoter());
      
      // Hapus data dari localStorage
      localStorage.removeItem("currentUser");
      
      // Navigasi ke halaman beranda
      navigate("/");
    },
    [dispatch, navigate] // Dependensi: jalankan hanya saat component mount pertama kali
  );
  
  return (

    <></>


  )
}

export default Logout