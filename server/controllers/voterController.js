

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const VoterModel = require('../models/voterModel');
const HttpError = require('../models/errorModel');





// Register a new voter
// post : /api/voters/register
// unprotected
const registerVoter = async (req, res, next) => {
    try {

        // Validate input
        const {fullName, email, password, password2} = req.body;
        if(!fullName || !email || !password || !password2) {
            return next(new HttpError("Please provide all required fields", 422));
        }
        
        // make all emails lowercase
        const newEmail = email.toLowerCase();
        // Check if voter already exists
        const existingVoter = await VoterModel.findOne({email: newEmail});
        if(existingVoter) {
            return next(new HttpError("Voter with this email already exists", 422));
        }

        // make sure password is at least 6 characters long
        if((password.trim().length) < 6) {
            return next(new HttpError("Password must be at least 6 characters long", 422));
        }


        // Check if passwords match
        if(password !== password2) {
            return next(new HttpError("Passwords do not match", 422));
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // No user/voter should be admin except for one with a specific email (for testing purposes)
        let isAdmin = false;
        if(newEmail === 'achiever@gmail.com') {
            isAdmin = true;
        }

        // Create new voter
        const newVoter = new VoterModel({
            fullName,
            email: newEmail,
            password: hashedPassword,
            isAdmin
        });

        // Save new voter
        await newVoter.save();

        res.status(201).json({message: `Voter ${newVoter.fullName} registered successfully!`, token: generateToken({id: newVoter._id})
    });

    } catch (error) {
        return next(new HttpError("Voter registration failed", 422));
    }

}




// Token Generator
const generateToken = (payload) => {
    // Generate a token with the payload and a secret key
    const token = jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRES_IN});
    return token;
}



// Login a voter
// post : /api/voters/login
// unprotected
const loginVoter = async (req, res, next) => {
    try {

        // Validate input
        const {email, password} = req.body;

        if(!email || !password) {
            return next(new HttpError("Please provide all required fields", 422));
        }

        // make all emails lowercase
        const newEmail = email.toLowerCase();

        // Check if voter exists
        const existingVoter = await VoterModel.findOne({email: newEmail});

        if(!existingVoter) {
            return next(new HttpError("Invalid credentials", 401));
        }

        // Check if password is correct
        const isPasswordMatch = await bcrypt.compare(password, existingVoter.password);

        if(!isPasswordMatch) {
            return next(new HttpError("Invalid credentials", 401));
        }


        const {_id: id , isAdmin, votedElections} = existingVoter;
        
        // Generate token
        const token = generateToken({id, isAdmin});

        res.json({
            message: 'Voter logged in successfully!',
            token,
            voter: {
                id,
                fullName: existingVoter.fullName,
                email: existingVoter.email,
                isAdmin,
                votedElections
            }
        });

    } catch (error) {
    return next(new HttpError("Voter login failed", 422));
}
}


// Get voter details
// post : /api/voters/:id
// protected
const getVoter = async (req, res, next) => {

    
    try {
        const {id} = req.params;
        
        const voter = await VoterModel.findById(id).select('-password');
        if(!voter) {
            return next(new HttpError("Voter not found", 404));
        }

        res.json({voter});
    } catch (error) {
        return next(new HttpError("Failed to get voter details", 422));
    }
}



module.exports = {registerVoter, loginVoter, getVoter};