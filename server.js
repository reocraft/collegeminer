const express = require('express');
const path = require('path');
const fs = require('fs');
const { recommend } = require('./lib/matcher');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const colleges = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'colleges.json'), 'utf8'));

app.post('/api/recommend', (req, res) => {
  try {
    const prefs = req.body;
    const results = recommend(prefs, colleges);
    res.json(results);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/majors', (req, res) => {
  const majorSet = new Set();
  for (const college of colleges) {
    for (const major of college.majors) {
      majorSet.add(major);
    }
  }
  res.json(Array.from(majorSet).sort());
});

app.listen(PORT, () => {
  console.log(`CollegeMiner running at http://localhost:${PORT}`);
});
