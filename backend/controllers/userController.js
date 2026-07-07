const User = require('../models/User');

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('name username email role')
            .sort({ username: 1, name: 1 });
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({message: 'Server error'});
    }
};

const getUserById = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findById(userId).select('name username email role');
        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user by ID:', error);
        res.status(500).json({message: 'Server error'});
    }
};

module.exports = {getAllUsers, getUserById};
