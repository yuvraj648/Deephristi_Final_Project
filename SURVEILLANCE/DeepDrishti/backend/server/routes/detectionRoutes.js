const express = require('express');
const axios = require('axios');
const {
  getAllDetections,
  getDetectionById,
  createDetection,
  autoCreateDetection,
  updateDetection,
  deleteDetection,
  confirmDetection,
  markFalsePositive,
  getDetectionStats
} = require('../controllers/detectionController');
const { protect } = require('../middleware/authMiddleware');
const {
  authorize,
  authorizeAllRegistered,
  blockAnalystWrites,
} = require('../middleware/authorize');

const router = express.Router();
const FLASK_URL = process.env.FLASK_API_URL || 'http://localhost:5001';

router.use(protect);
router.use(blockAnalystWrites);

router.get('/', authorizeAllRegistered(), getAllDetections);

router.get('/stats', authorizeAllRegistered(), getDetectionStats);

// HITL: Proxy finetune status/trigger to Flask
router.get('/finetune/status', authorizeAllRegistered(), async (req, res) => {
  try {
    const r = await axios.get(`${FLASK_URL}/finetune/status`, { timeout: 5000 });
    res.json(r.data);
  } catch (e) {
    res.json({ success: false, message: 'Flask not reachable', error: e.message });
  }
});

router.post('/finetune/trigger', authorize('captain', 'engineer'), async (req, res) => {
  try {
    const r = await axios.post(`${FLASK_URL}/finetune/trigger`, {}, { timeout: 5000 });
    res.json(r.data);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/finetune/promote', authorize('captain'), async (req, res) => {
  try {
    const r = await axios.post(`${FLASK_URL}/finetune/promote`, {}, { timeout: 10000 });
    res.json(r.data);
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/:id', authorizeAllRegistered(), getDetectionById);

// Mutations — captain & engineer (AI / detection pipeline operators)
router.post('/', authorize('captain', 'engineer'), createDetection);

router.post('/auto', authorize('captain', 'engineer'), autoCreateDetection);

router.put('/:id', authorize('captain', 'engineer'), updateDetection);

router.delete('/:id', authorize('captain', 'engineer'), deleteDetection);

router.patch(
  '/:id/confirm',
  authorize('captain', 'vice_captain', 'surveillance_head', 'engineer'),
  confirmDetection
);

router.patch(
  '/:id/false-positive',
  authorize('captain', 'vice_captain', 'surveillance_head', 'engineer'),
  markFalsePositive
);

module.exports = router;
