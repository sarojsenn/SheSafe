const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const PORT = 3000;


app.use(cors());
app.use(express.json());


app.use(express.static(path.join(__dirname, 'public')));


const incidents = [];
const taggedLocations = [];


app.post('/api/report', (req, res) => {
  const { location, description, latlng } = req.body;
  const incident = {
    location,
    description,
    latlng,
    timestamp: new Date()
  };
  incidents.push(incident);
  console.log('Incident reported:', incident);
  res.json({
    success: true,
    message: 'Incident reported',
    data: incident
  });
});


app.get('/api/alerts', (req, res) => {
  res.json({
    success: true,
    data: incidents
  });
});


app.post('/api/tag-location', (req, res) => {
  const { lat, lng, status } = req.body;
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    !['safe', 'unsafe'].includes(status)
  ) {
    return res.status(400).json({ success: false, message: 'Invalid data.' });
  }
  const tag = {
    lat,
    lng,
    status,
    timestamp: new Date()
  };
  taggedLocations.push(tag);
  console.log('Location tagged:', tag);
  res.json({
    success: true,
    message: `Location tagged as ${status.toUpperCase()}`,
    data: tag
  });
});


app.get('/api/tagged-locations', (req, res) => {
  res.json({
    success: true,
    data: taggedLocations
  });
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


app.post('/api/save-voice', (req, res) => {
  const { voice_text } = req.body;
  if (!voice_text) {
    return res.status(400).json({ success: false, message: "No voice_text provided" });
  }
 
  console.log('Received voice input:', voice_text);
  res.json({ success: true, message: "Voice text received and printed to terminal." });
});

