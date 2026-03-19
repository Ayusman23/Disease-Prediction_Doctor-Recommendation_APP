const { SqlUser } = require('../models/sql');

exports.syncUser = async (req, res) => {
  try {
    const { uid, name, email, role, photoURL } = req.body;
    
    if (!uid || !email) {
      return res.status(400).json({ error: 'UID and Email are required' });
    }

    // Upsert user in SQL
    const [user, created] = await SqlUser.findOrCreate({
      where: { uid },
      defaults: { name, email, role, photoURL, lastLogin: new Date() }
    });

    if (!created) {
      // Update existing user
      user.name = name || user.name;
      user.role = role || user.role;
      user.photoURL = photoURL || user.photoURL;
      user.lastLogin = new Date();
      await user.save();
    }

    res.json({ success: true, user });
  } catch (err) {
    console.error('SQL User Sync Error:', err);
    res.status(500).json({ error: 'Server error syncing user to SQL' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await SqlUser.findAll({ order: [['createdAt', 'DESC']] });
    res.json(users);
  } catch (err) {
    console.error('SQL Get Users Error:', err);
    res.status(500).json({ error: 'Server error fetching users from SQL' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { uid } = req.params;
    await SqlUser.destroy({ where: { uid } });
    res.json({ success: true, message: 'User deleted from SQL' });
  } catch (err) {
    console.error('SQL Delete User Error:', err);
    res.status(500).json({ error: 'Server error deleting user from SQL' });
  }
};

