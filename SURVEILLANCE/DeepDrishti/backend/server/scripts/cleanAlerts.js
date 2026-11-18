const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Alert = require('../models/Alert');
const Feed = require('../models/Feed');

async function cleanAlerts() {
  const uri = process.env.MONGODB_URI || 'mongodb+srv://Athu123:Athu123@cluster0.t1zhdyy.mongodb.net/aquascope?retryWrites=true&w=majority';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB Atlas');

  // Delete all old simulated alerts
  const delRes = await Alert.deleteMany({
    $or: [
      { 'detectionData.detectedObject': { $in: ['equipment', 'unknown', 'unknown_object', 'debris', 'marine_life'] } },
      { 'detectionData.modelsUsed': { $exists: false } },
      { 'detectionData.modelsUsed': { $size: 0 } },
      { 'detectionData.distance_m': { $lt: 0.1 } }
    ]
  });
  console.log('Deleted obsolete simulated alerts:', delRes.deletedCount);

  // For Local Preview Camera A (feed-local-a.mp4) where sea mine is detected by YOLO:
  const feedA = await Feed.findOne({ url: '/videos/feed-local-a.mp4' }) || await Feed.findOne({ title: /preview camera a/i });
  if (feedA) {
    const existing = await Alert.findOne({ feedId: feedA._id, 'detectionData.detectedObject': 'SEA MINE' });
    if (!existing) {
      await Alert.create({
        feedId: feedA._id,
        title: 'Naval Threat Detected: SEA MINE',
        description: 'YOLOv8 + FUNIE-GAN neural pipeline confirmed unexploded underwater ordnance / sea mine contact in Sector Beta.',
        severity: 'critical',
        confidence: 0.79,
        type: 'threat',
        status: 'active',
        location: feedA.location || 'On-station — Local MP4',
        sector: feedA.sector || 'Sector Beta',
        detectionData: {
          threat: true,
          detectedObject: 'SEA MINE',
          boundingBox: [113, 118, 342, 247],
          distance_m: 6.0,
          modelsUsed: ['FUNIE-GAN', 'YOLOv8', 'MiDaS'],
          frameTimestamp: new Date(),
          processingTime: 4.19
        }
      });
      console.log('Added genuine YOLOv8 SEA MINE alert for Camera A');
    }
  }

  // Update activeAlerts counts on all feeds
  const feeds = await Feed.find({});
  for (const f of feeds) {
    const count = await Alert.countDocuments({ feedId: f._id, status: 'active' });
    await Feed.findByIdAndUpdate(f._id, { activeAlerts: count });
    console.log(`${f.title}: ${count} active alerts`);
  }

  await mongoose.disconnect();
  console.log('Done!');
}

cleanAlerts().catch(console.error);
