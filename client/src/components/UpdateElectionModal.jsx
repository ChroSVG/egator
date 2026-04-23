import React , {useState, useEffect }from 'react'
import {IoMdClose} from 'react-icons/io'
import { useDispatch , useSelector} from 'react-redux'
import {UiActions } from '../store/ui-slice'
import axios from 'axios'
import { useNavigate } from 'react-router-dom' // Tambahkan ini

const UpdateElectionModal = () => {
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [thumbnail, setThumbnail] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const currentVoter = useSelector(state => state.vote.currentVoter)
    const token = currentVoter?.token

    const navigate = useNavigate() // Tambahkan ini

    const idOfElectionToUpdate = useSelector(state => state.vote.idOfElectionToUpdate)

    const dispatch = useDispatch()

    // close update election modal
    const closeUpdateElectionModal = () => {
        dispatch(UiActions.closeUpdateElectionModal())
    }

    // Update election function
    const updateElection = async (e) => {
        e.preventDefault()

        // Validasi
        if (!title || !description || !thumbnail) {
            alert("Please fill in all fields")
            return;
        }

        setIsSubmitting(true) // Mulai loading

        try {
            const data = new FormData()
            data.append('title', title)
            data.append('description', description)
            data.append('thumbnail', thumbnail)

            await axios.patch(`${import.meta.env.VITE_API_URL}/elections/${idOfElectionToUpdate}`, data, {
                withCredentials: true,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            alert("Election updated successfully!");
            closeUpdateElectionModal();
            navigate(0); // Refresh page
        } catch (error) {
            console.log(error)
            const errorMsg = error.response?.data?.message || error.message;
            alert("Error: " + errorMsg);
        } finally {
            setIsSubmitting(false) // Selesai loading
        }
    }

    const getElectionDetails = async () => {
        try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/elections/${idOfElectionToUpdate}`, {
                withCredentials: true,
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            const electionData = response.data.data;
            setTitle(electionData.title)
            setDescription(electionData.description)
            setThumbnail(electionData.thumbnail)
        } catch (error) {
            console.log(error)
            const errorMsg = error.response?.data?.message || error.message;
            alert("Error: " + errorMsg);
        }
    }


    useEffect(() => {
        getElectionDetails()
        console.log(idOfElectionToUpdate)
    }, [idOfElectionToUpdate, token])

  return (
    <section className="modal">
        <div className="modal__content">
            <header className="modal__header">
                <h4>Edit New Election</h4>
                <button className="modal__close" onClick={closeUpdateElectionModal}><IoMdClose /></button>
            </header>
            <form onSubmit={updateElection}>
                <div>
                    <h6>Election Title:</h6>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} name='title'/>
                </div>
                <div>
                    <h6>Election Description: </h6>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} name="description" />
                </div>
                <div>
                    <h6>Election Thumbnail:</h6>
                    {/* Tampilkan pratinjau gambar yang ada saat ini */}
                    {thumbnail && typeof thumbnail === 'string' && (
                        <div style={{ marginBottom: '10px' }}>
                            <img src={thumbnail} alt="Current Thumbnail" style={{ width: '100px', borderRadius: '5px' }} />
                            <p><small>Current Thumbnail</small></p>
                        </div>
                    )}
                    <input type="file" onChange={e => setThumbnail(e.target.files[0])} name="thumbnail" accept="image/*"/>
                </div>
                <button type="submit" className="btn primary" disabled={isSubmitting}>
                    {isSubmitting ? "Updating..." : "Update Election"}
                </button>
            </form>
        </div>
    </section>

)
}

export default UpdateElectionModal