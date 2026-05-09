import React , {useState}from 'react'
import {IoMdClose} from 'react-icons/io'
import { useDispatch, useSelector } from 'react-redux'
import {UiActions } from '../store/ui-slice'
import API from '../utils/axiosConfig'
import { voteActions } from '../store/vote-slice'
const AddElectionModal = () => {
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [thumbnail, setThumbnail] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false) // Tambahkan ini

    const dispatch = useDispatch()

    const navigate = useNavigate()
    // close add election modal
    const closeAddElectionModal = () => {
        dispatch(UiActions.closeElectionModal())
    }
    
    const currentUser = useSelector(state => state.vote.currentVoter)
    const token = currentUser?.token


    const createElection = async(e) => {
        e.preventDefault()
        
        if (!title || !description || !thumbnail) {
            alert("Please fill all fields and select a thumbnail image.");
            return;
        }

        setIsSubmitting(true) // Mulai loading

        try {
            const data = new FormData()
            data.append('title', title)
            data.append('description', description)
            data.append('thumbnail', thumbnail)

            const response = await API.post('/elections', data)

            if (response.status === 201) {
                alert("Election created successfully!");
                closeAddElectionModal()
                dispatch(voteActions.triggerRefresh())
                navigate(`/elections`)
            }
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message;
            console.error("Create Election Error:", error.response?.data || error);
            alert("Error: " + errorMsg);
        } finally {
            setIsSubmitting(false) // Selesai loading
        }
    }


  return (
    <section className="modal">
        <div className="modal__content">
            <header className="modal__header">
                <h4>Create New Election</h4>
                <button className="modal__close" onClick={closeAddElectionModal}><IoMdClose /></button>
            </header>
            <form onSubmit={createElection}>
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
                    <input type="file" onChange={e => setThumbnail(e.target.files[0])} name="thumbnail" accept="image/*"/>
                </div>
                <button type="submit" className="btn primary" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Add Election"}
                </button>
            </form>
        </div>
    </section>
  )
}

export default AddElectionModal