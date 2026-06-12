const User = require('../models/User');

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select("-password");
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({message: 'Server error'});
    }
};

const getUserById = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId).select("-password");
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user by ID:', error);
        if (error.name === "CastError") {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }
        res.status(500).json({message: 'Server error'});
    }
};

module.exports = {getAllUsers, getUserById};