/**
 * Pagination Middleware
 * 
 * Provides consistent pagination across all list endpoints.
 * Supports page/limit query parameters with sensible defaults.
 * 
 * Query Parameters:
 *  - page: Page number (default: 1)
 *  - limit: Items per page (default: 10, max: 100)
 * 
 * Response includes pagination metadata:
 *  - page: Current page number
 *  - limit: Items per page
 *  - total: Total number of items
 *  - pages: Total number of pages
 *  - hasNext: Whether there's a next page
 *  - hasPrev: Whether there's a previous page
 */

const paginate = (options = {}) => {
    const {
        defaultPage = 1,
        defaultLimit = 10,
        maxLimit = 100
    } = options;

    return (req, res, next) => {
        // Parse page parameter
        let page = parseInt(req.query.page) || defaultPage;
        if (page < 1) page = defaultPage;

        // Parse limit parameter
        let limit = parseInt(req.query.limit) || defaultLimit;
        if (limit < 1) limit = defaultLimit;
        if (limit > maxLimit) limit = maxLimit;

        // Calculate skip for database query
        const skip = (page - 1) * limit;

        // Attach pagination helpers to request
        req.pagination = {
            page,
            limit,
            skip,
            getPaginationData: (total) => ({
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1
            })
        };

        // Override res.paginatedJson to automatically include pagination metadata
        const originalJson = res.json.bind(res);
        res.paginatedJson = async (query, transformFn = null) => {
            const [data, total] = await Promise.all([
                query.skip(req.pagination.skip).limit(req.pagination.limit),
                query.model.countDocuments(query.getFilter())
            ]);

            const pagination = req.pagination.getPaginationData(total);
            
            const response = {
                success: true,
                count: data.length,
                ...pagination,
                data: transformFn ? data.map(transformFn) : data
            };

            return originalJson(response);
        };

        next();
    };
};

/**
 * Simple pagination helper for manual use
 */
const getPagination = (page = 1, limit = 10) => {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    return {
        page: parseInt(page),
        limit: parseInt(limit),
        skip,
        getPaginationData: (total) => ({
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit)),
            hasNext: parseInt(page) * parseInt(limit) < total,
            hasPrev: parseInt(page) > 1
        })
    };
};

module.exports = {
    paginate,
    getPagination
};
