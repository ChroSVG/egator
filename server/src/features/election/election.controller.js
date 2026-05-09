const ElectionService = require('./election.service');
const cacheService = require('../../shared/utils/cacheService');
const HttpError = require('../../shared/models/errorModel');
const responseHelper = require('../../shared/utils/responseHelper');

const electionService = new ElectionService();

/**
 * Add New Election
 */
const addElection = async (req, res, next) => {
    try {
        const { title, description } = req.body;

        if (!req.files || !req.files.thumbnail) {
            throw new HttpError('Please provide a thumbnail image', 400);
        }

        const election = await electionService.createElection(
            { title, description },
            req.files.thumbnail
        );

        await cacheService.invalidateElection();

        return responseHelper.success(res, {
            statusCode: 201,
            message: 'Election added successfully!',
            data: election
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get All Elections
 */
const getElections = async (req, res, next) => {
    try {
        const { isActive = 'true', page = 1, limit = 10 } = req.query;
        const cacheKey = `elections:${isActive}:${page}:${limit}`;
        
        const result = await cacheService.getOrSet(
            cacheKey,
            async () => {
                return await electionService.getElections({ isActive, page, limit });
            },
            300
        );

        const { data, pagination } = result;
        return responseHelper.success(res, {
            message: 'Elections retrieved successfully!',
            data,
            pagination
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get Single Election
 */
const getSingleElection = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { includeCandidates } = req.query;
        const cacheKey = `election:${id}:${includeCandidates}`;

        const election = await cacheService.getOrSet(
            cacheKey,
            async () => {
                return await electionService.getElectionById(id, includeCandidates === 'true');
            },
            600
        );

        return responseHelper.success(res, {
            message: 'Election retrieved successfully!',
            data: election
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update Election
 */
const updateElection = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, description } = req.body;

        const election = await electionService.updateElection(
            id,
            { title, description },
            req.files?.thumbnail || null
        );

        await cacheService.invalidateElection(id);

        return responseHelper.success(res, {
            message: 'Election updated successfully!',
            data: election
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete Election
 */
const deleteElection = async (req, res, next) => {
    try {
        const { id } = req.params;
        const election = await electionService.deleteElection(id);
        await cacheService.invalidateElection(id);

        return responseHelper.success(res, {
            message: 'Election deleted successfully!',
            data: election
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get Election Candidates
 */
const getCandidatesOfElection = async (req, res, next) => {
    try {
        const { id } = req.params;
        const candidates = await electionService.getElectionCandidates(id);

        return responseHelper.success(res, {
            message: 'Election candidates retrieved successfully!',
            data: candidates
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get Election Voters
 */
const getVotersOfElection = async (req, res, next) => {
    try {
        const { id } = req.params;
        const voters = await electionService.getElectionVoters(id);

        return responseHelper.success(res, {
            message: 'Election voters retrieved successfully!',
            data: voters
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get Election Results
 */
const getElectionResults = async (req, res, next) => {
    try {
        const { electionId } = req.params;
        const cacheKey = `election:${electionId}:results`;

        const results = await cacheService.getOrSet(
            cacheKey,
            async () => {
                return await electionService.getElectionResults(electionId);
            },
            60
        );

        return responseHelper.success(res, {
            message: 'Election results retrieved successfully!',
            data: results
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    addElection,
    getElections,
    getSingleElection,
    getCandidatesOfElection,
    getVotersOfElection,
    getElectionResults,
    updateElection,
    deleteElection
};
