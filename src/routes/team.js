/* eslint-disable no-underscore-dangle */
const express = require('express');
const mongoose = require('mongoose');

const User = require('../models/User');
const Team = require('../models/Team');
const Post = require('../models/Post');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

router.post('/create', verifyToken, async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const { userId } = req.data;

    const team = await Team.create({
      name,
      description,
      owner: userId,
    });

    team.members.push(new mongoose.Types.ObjectId(userId));
    team.admins.push(new mongoose.Types.ObjectId(userId));

    await team.save();

    const user = await User.findById(userId);

    user.teams.push(new mongoose.Types.ObjectId(team._id));

    await user.save();

    return res.status(200).json({
      message: 'Team created successfully',
      team,
    });
  } catch (error) {
    return res.status(500).json({
      error,
    });
  }
});

router.get('/get-teams', verifyToken, async (req, res) => {
  try {
    const { userId } = req.data;

    const teams = await Team.find({ members: userId });

    const user = await User.findById(userId)
      .select('name')
      .populate('favourites');

    return res.status(200).json({ teams, user });
  } catch (error) {
    return res.status(404).json({ message: 'Something went wrong' });
  }
});

router.post('/leave', verifyToken, async (req, res) => {
  try {
    const { teamId } = req.body;
    const { userId } = req.data;

    await Team.findOneAndUpdate(
      { _id: teamId },
      { $pull: { members: new mongoose.Types.ObjectId(userId) } },
    );

    await User.findOneAndUpdate(
      { _id: userId },
      { $pull: { teams: new mongoose.Types.ObjectId(teamId) } },
    );

    return res.status(200).json({ message: 'Successfully left the team!' });
  } catch (error) {
    return res.status(404).json({ message: 'Something went wrong' });
  }
});

router.post('/remove', verifyToken, async (req, res) => {
  try {
    const { teamId } = req.body;
    const { userId } = req.data;

    const team = await Team.findById(teamId);

    if (!team.owner.equals(userId)) {
      return res.status(401).json({ message: 'Something went wrong' });
    }

    await team.remove();

    await User.findOneAndUpdate(
      { _id: userId },
      { $pull: { teams: new mongoose.Types.ObjectId(teamId) } },
    );

    await Post.deleteMany({ team: teamId });

    return res.status(200).json({ message: 'Successfully removed team' });
  } catch (error) {
    return res.status(404).json({ message: 'Something went wrong' });
  }
});

router.post('/add-to-favourites', verifyToken, async (req, res) => {
  try {
    const { teamId } = req.body;

    const { userId } = req.data;

    const user = await User.findById(userId);

    user.favourites.push(new mongoose.Types.ObjectId(teamId));

    await user.save();

    return res.status(200).json({ message: 'Team added to favourites' });
  } catch (error) {
    return res.status(404).json({ message: 'Something went wrong' });
  }
});

router.post('/remove-from-favourites', verifyToken, async (req, res) => {
  try {
    const { teamId } = req.body;

    const { userId } = req.data;

    await User.findOneAndUpdate(
      { _id: userId },
      { $pull: { favourites: new mongoose.Types.ObjectId(teamId) } },
    );

    const user = await User.findById(userId);

    return res.status(200).json({ message: 'Team removed from favourites' });
  } catch (error) {
    return res.status(404).json({ message: 'Something went wrong' });
  }
});

module.exports = router;
