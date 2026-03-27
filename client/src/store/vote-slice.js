
import { createSlice }from '@reduxjs/toolkit'; 



const currentVoter = JSON.parse(localStorage.getItem("currentVoter")) || null
const initialState = {currentVoter, selectedVoteCandidate: "", selectedElection: "", idOfElectionToUpdate: "", addCandidateElectionId: ""}

const voteSlice = createSlice({
    name: 'vote',
    initialState,
    reducers: {
        changeSelectedVoteCandidate(state, action) {
            state.selectedVoteCandidate = action.payload
        },
        changeCurrentVoter(state, action) {
            state.currentVoter = action.payload;
            // Jangan lupa update localStorage juga di sini agar sinkron!
            localStorage.setItem("currentVoter", JSON.stringify(action.payload));
        },
        changeSelectedElection(state, action) {
            state.selectedElection = action.payload
        },
        changeIdOfCandidateElectionId(state, action) {
            state.addCandidateElectionId = action.payload
        },
        changeAddCandidateElectionId(state, action) {
            state.addCandidateElectionId = action.payload
        },
        // AKSI TAMBAHAN: Logout
        logoutVoter(state) {
        state.currentVoter = null;
        localStorage.removeItem("currentVoter");
        // Reset state lainnya agar bersih
        state.selectedVoteCandidate = "";
        state.selectedElection = "";
        },
        
        
}
})

export const voteActions = voteSlice.actions

export default voteSlice