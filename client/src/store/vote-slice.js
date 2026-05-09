
import { createSlice }from '@reduxjs/toolkit'; 



const currentVoter = JSON.parse(localStorage.getItem("currentUser")) || null
const initialState = {
    currentVoter, 
    selectedVoteCandidate: "", 
    selectedElection: "", 
    idOfElectionToUpdate: "", 
    addCandidateElectionId: "",
    electionCandidates: [], // TAMBAHKAN INI
    voters: [] // TAMBAHKAN INI
}

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
            localStorage.setItem("currentUser", JSON.stringify(action.payload));
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
        changeIdOfElectionToUpdate(state, action) {
            state.idOfElectionToUpdate = action.payload
        },
        // TAMBAHKAN REDUCER INI
        setElectionCandidates(state, action) {
            state.electionCandidates = action.payload
        },
        setVoters(state, action) {
            state.voters = action.payload
        },
        // AKSI TAMBAHAN: Logout
        logoutVoter(state) {
            state.currentVoter = null;
            localStorage.removeItem("currentUser");
            // Reset state lainnya agar bersih
            state.selectedVoteCandidate = "";
            state.selectedElection = "";
            state.electionCandidates = [];
            state.voters = [];
        },
    }
})

export const voteActions = voteSlice.actions

export default voteSlice