const mongoose = require('mongoose');

/**
 * Base Repository
 * 
 * Implements the Repository Pattern - provides a collection-like interface
 * for performing CRUD operations on domain objects.
 * 
 * Benefits:
 * - Decouples business logic from data access logic
 * - Makes testing easier (can mock repositories)
 * - Centralizes common database operations
 */
class BaseRepository {
    constructor(model) {
        this.model = model;
    }

    /**
     * Find document by ID
     * @param {string} id - Document ID
     * @param {object} options - Query options (populate, select, etc.)
     * @returns {Promise<object|null>}
     */
    async findById(id, options = {}) {
        const { populate = null, select = null, session = null } = options;
        
        let query = this.model.findById(id);
        
        if (select) query = query.select(select);
        if (populate) query = query.populate(populate);
        if (session) query = query.session(session);
        
        return await query;
    }

    /**
     * Find all documents matching filter
     * @param {object} filter - Query filter
     * @param {object} options - Query options
     * @returns {Promise<Array>}
     */
    async findAll(filter = {}, options = {}) {
        const { 
            populate = null, 
            select = null, 
            sort = { createdAt: -1 },
            skip = 0,
            limit = 0,
            session = null
        } = options;
        
        let query = this.model.find(filter);
        
        if (select) query = query.select(select);
        if (populate) query = query.populate(populate);
        if (sort) query = query.sort(sort);
        if (skip) query = query.skip(skip);
        if (limit) query = query.limit(limit);
        if (session) query = query.session(session);
        
        return await query;
    }

    /**
     * Find single document
     * @param {object} filter - Query filter
     * @returns {Promise<object|null>}
     */
    async findOne(filter, options = {}) {
        const { select = null, session = null } = options;
        
        let query = this.model.findOne(filter);
        
        if (select) query = query.select(select);
        if (session) query = query.session(session);
        
        return await query;
    }

    /**
     * Create new document
     * @param {object} data - Document data
     * @param {object} options - Save options
     * @returns {Promise<object>}
     */
    async create(data, options = {}) {
        const { session = null } = options;
        
        const doc = new this.model(data);
        return await doc.save({ session });
    }

    /**
     * Update document by ID
     * @param {string} id - Document ID
     * @param {object} update - Update data
     * @param {object} options - Update options
     * @returns {Promise<object|null>}
     */
    async updateById(id, update, options = {}) {
        // 1. Ambil session jika ada (untuk transaksi)
        const { session = null } = options;
        
        return await this.model.findByIdAndUpdate(
            id,
            // 2. Gunakan $set untuk memastikan hanya field yang dikirim yang diupdate
            { $set: update }, 
            { 
                // 3. Gunakan returnDocument: 'after' untuk menggantikan new: true (menghapus warning)
                returnDocument: 'after', 
                // 4. Set runValidators ke false agar tidak protes kolom required lain saat update parsial
                runValidators: false, 
                session 
            }
        );
    }

    /**
     * Update single document
     * @param {object} filter - Query filter
     * @param {object} update - Update data
     * @returns {Promise<object>}
     */
    async updateOne(filter, update, options = {}) {
        const { session = null } = options;
        
        return await this.model.updateOne(filter, update, { session });
    }

    /**
     * Delete document by ID
     * @param {string} id - Document ID
     * @param {object} options - Delete options
     * @returns {Promise<object|null>}
     */
    async deleteById(id, options = {}) {
        const { session = null } = options;
        
        return await this.model.findByIdAndDelete(id, { session });
    }

    /**
     * Delete documents matching filter
     * @param {object} filter - Query filter
     * @param {object} options - Delete options
     * @returns {Promise<object>}
     */
    async deleteMany(filter, options = {}) {
        const { session = null } = options;
        
        return await this.model.deleteMany(filter, { session });
    }

    /**
     * Count documents
     * @param {object} filter - Query filter
     * @returns {Promise<number>}
     */
    async count(filter = {}) {
        return await this.model.countDocuments(filter);
    }

    /**
     * Check if document exists
     * @param {object} filter - Query filter
     * @returns {Promise<boolean>}
     */
    async exists(filter, options = {}) {
        const doc = await this.findOne(filter, options);
        return doc !== null;
    }

    /**
     * Paginated query
     * @param {object} filter - Query filter
     * @param {number} page - Page number
     * @param {number} limit - Items per page
     * @param {object} options - Query options
     * @returns {Promise<object>}
     */
    async paginate(filter, page = 1, limit = 10, options = {}) {
        const skip = (page - 1) * limit;
        
        const [data, total] = await Promise.all([
            this.findAll(filter, { ...options, skip, limit }),
            this.count(filter)
        ]);
        
        return {
            data,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1
            }
        };
    }

    /**
     * Bulk operations
     * @param {Array} operations - Array of operations
     * @param {object} options - Bulk write options
     * @returns {Promise<object>}
     */
    async bulkWrite(operations, options = {}) {
        const { session = null } = options;
        
        return await this.model.bulkWrite(operations, { session });
    }
}

module.exports = BaseRepository;
