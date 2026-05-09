import { createSlice } from '@reduxjs/toolkit';

const currentVoter = JSON.parse(localStorage.getItem("currentUser")) || null;

const initialState = {
    currentVoter,
    selectedVoteCandidate: "",
    selectedElection: "",
    idOfElectionToUpdate: "",
    addCandidateElectionId: "",
    electionCandidates: [],
    voters: [],
    elections: [],
    refreshTrigger: 0
};

const voteSlice = createSlice({
    name: 'vote',
    initialState,
    reducers: {
        changeSelectedVoteCandidate(state, action) {
            state.selectedVoteCandidate = action.payload;
        },
        changeCurrentVoter(state, action) {
            state.currentVoter = action.payload;
            localStorage.setItem("currentUser", JSON.stringify(action.payload));
        },
        changeSelectedElection(state, action) {
            state.selectedElection = action.payload;
        },
        changeIdOfElectionToUpdate(state, action) {
            state.idOfElectionToUpdate = action.payload;
        },
        changeAddCandidateElectionId(state, action) {
            state.addCandidateElectionId = action.payload;
        },
        setElectionCandidates(state, action) {
            state.electionCandidates = action.payload;
        },
        setVoters(state, action) {
            state.voters = action.payload;
        },
        setElections(state, action) {
            state.elections = action.payload;
        },
        triggerRefresh(state) {
            state.refreshTrigger = Date.now();
        },
        logoutVoter(state) {
            state.currentVoter = null;
            localStorage.removeItem("currentUser");
            state.selectedVoteCandidate = "";
            state.selectedElection = "";
            state.electionCandidates = [];
            state.voters = [];
        },
    }
});

export const voteActions = voteSlice.actions;

export default voteSlice;