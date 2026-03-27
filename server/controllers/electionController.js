const ElectionService = require('../services/electionService');
const cacheService = require('../utils/cacheService');
const { cloudinaryBreaker } = require('../utils/circuitBreaker');
const HttpError = require('../models/errorModel');

const electionService = new ElectionService();

/**
 * Add New Election
 * POST /api/elections
 */
const addElection = async (req, res, next) => {
    try {
        // if (!req.user.isAdmin) {
        //     throw new HttpError('You are not authorized to add an election', 403);
        // }

        const { title, description } = req.body;

        if (!req.files || !req.files.thumbnail) {
            throw new HttpError('Please provide a thumbnail image', 400);
        }

        const election = await electionService.createElection(
            { title, description },
            req.files.thumbnail
        );

        // Invalidate elections cache
        await cacheService.invalidateElection();

        return res.status(201).json({
            message: 'Election added successfully!',
            data: election
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get All Elections
 * GET /api/elections
 */
const getElections = async (req, res, next) => {
    try {
        const { isActive = 'true', page = 1, limit = 10 } = req.query;

        // Try cache first
        const cacheKey = `elections:${isActive}:${page}:${limit}`;
        
        const result = await cacheService.getOrSet(
            cacheKey,
            async () => {
                return await electionService.getElections({ isActive, page, limit });
            },
            300 // 5 minutes TTL
        );


        const { data, ...otherProps } = result;

        return res.json({
            message: 'Elections retrieved successfully!',
            elections: data,
            ...otherProps,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get Single Election
 * GET /api/elections/:id
 */
const getSingleElection = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { includeCandidates } = req.query;

        // Try cache first
        const cacheKey = `election:${id}:${includeCandidates}`;

        const election = await cacheService.getOrSet(
            cacheKey,
            async () => {
                return await electionService.getElectionById(id, includeCandidates === 'true');
            },
            600 // 10 minutes TTL
        );

        return res.json({
            message: 'Election retrieved successfully!',
            data: election
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update Election
 * PATCH /api/elections/:id
 */
const updateElection = async (req, res, next) => {
    try {
        // if (!req.user.isAdmin) {
        //     throw new HttpError('You are not authorized to update an election', 403);
        // }

        const { id } = req.params;
        const { title, description } = req.body;

        const election = await electionService.updateElection(
            id,
            { title, description },
            req.files?.thumbnail || null
        );

        // Invalidate cache
        await cacheService.invalidateElection(id);

        return res.json({
            message: 'Election updated successfully!',
            data: election
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete Election
 * DELETE /api/elections/:id
 */
const deleteElection = async (req, res, next) => {
    try {
        // if (!req.user.isAdmin) {
        //     throw new HttpError('You are not authorized to delete an election', 403);
        // }

        const { id } = req.params;

        const election = await electionService.deleteElection(id);

        // Invalidate cache
        await cacheService.invalidateElection(id);

        return res.json({
            message: 'Election deleted successfully!',
            data: election
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get Election Candidates
 * GET /api/elections/:id/candidates
 */
const getCandidatesOfElection = async (req, res, next) => {
    try {
        const { id } = req.params;
        console.log('[getCandidatesOfElection] Election ID:', id);

        const candidates = await electionService.getElectionCandidates(id);
        console.log('[getCandidatesOfElection] Candidates:', candidates);

        return res.json({
            message: 'Election candidates retrieved successfully!',
            count: candidates.length,
            data: candidates
        });
    } catch (error) {
        console.error('[getCandidatesOfElection] Error:', error);
        next(error);
    }
};

/**
 * Get Election Voters
 * GET /api/elections/:id/voters
 */
const getVotersOfElection = async (req, res, next) => {
    try {
        const { id } = req.params;

        const voters = await electionService.getElectionVoters(id);

        return res.json({
            message: 'Election voters retrieved successfully!',
            count: voters.length,
            data: voters
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get Election Results
 * GET /api/elections/:electionId/results
 */
const getElectionResults = async (req, res, next) => {
    try {
        const { electionId } = req.params;

        // Try cache first
        const cacheKey = `election:${electionId}:results`;

        const results = await cacheService.getOrSet(
            cacheKey,
            async () => {
                return await electionService.getElectionResults(electionId);
            },
            60 // 1 minute TTL - results may change frequently
        );

        res.json({
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
