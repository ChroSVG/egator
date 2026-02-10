import React , {useState}from 'react'
import {IoMdClose} from 'react-icons/io'
import { useDispatch } from 'react-redux'
import {UiActions } from '../store/ui-slice'

const UpdateElectionModal = () => {
    const [title, setTitle] = useState("")
    const [description, setDescription] = useState("")
    const [thumbnail, setThumbnail] = useState("")

    const dispatch = useDispatch()

    // close update election modal
    const closeUpdateElectionModal = () => {
        dispatch(UiActions.closeUpdateElectionModal())
    }


  return (
    <section className="modal">
        <div className="modal__content">
            <header className="modal__header">
                <h4>Edit New Election</h4>
                <button className="modal__close" onClick={closeUpdateElectionModal}><IoMdClose /></button>
            </header>
            <form>
                <div>
                    <h6>Election Title:</h6>
                    <input type="text" value={title} onChange={e => setTitle(e.target.value)} name='title'/>
                </div>
                <div>
                    <h6>Election Description: </h6>
                    <input type="text" onChange={e => setDescription(e.target.value)} name="description" />
                </div>
                <div>
                    <h6>Election Thumbnail:</h6>
                    <input type="file" onChange={e => setThumbnail(e.target.files[0])} name="thumbnail" accept="image/*"/>
                </div>
                <button type="submit" className="btn primary"  >Update Election</button>
            </form>
        </div>
    </section>

)
}

export default UpdateElectionModal