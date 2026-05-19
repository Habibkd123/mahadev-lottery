require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('tiny'));
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/mahadavlottery';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '12345';

mongoose.set('strictQuery', false);
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB Connected');
    // Import model AFTER connection to avoid index warning race conditions
    const Result = require('./models/Result');
    registerRoutes(Result);
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB Error:', err);
    process.exit(1);
  });

function registerRoutes(Result) {

  // ── Middleware ───────────────────────────────────────────────
  const requireAdmin = (req, res, next) => {
    const password = req.headers['x-admin-password'];
    if (!password || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized access' });
    }
    next();
  };

  // ── Public Routes ────────────────────────────────────────────

  // GET all results (public)
  app.get('/api/results', async (req, res) => {
    try {
      const getISTDate = (offsetDays = 0) => {
        const d = new Date();
        d.setMinutes(d.getMinutes() + 330);
        d.setDate(d.getDate() + offsetDays);
        return d.toISOString().split('T')[0];
      };

      const todayStr = getISTDate(0);
      const yesterdayStr = getISTDate(-1);

      // Current time in IST (minutes from midnight)
      const now = new Date();
      const istTime = new Date(now.getTime() + (330 * 60000));
      const currentMinutes = istTime.getUTCHours() * 60 + istTime.getUTCMinutes();

      // Helper to convert 'hh:mm A' to minutes from midnight
      const timeToMinutes = (timeStr) => {
        const match = (timeStr || '').trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!match) return -1;
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const ampm = match[3].toUpperCase();
        if (hours === 12) {
          hours = ampm === 'AM' ? 0 : 12;
        } else if (ampm === 'PM') {
          hours += 12;
        }
        return hours * 60 + minutes;
      };

      const dbRows = await Result.find({ date: { $in: [todayStr, yesterdayStr] } }).sort({ sno: 1 });
      const resultMap = {};

      dbRows.forEach(row => {
        if (!resultMap[row.time]) {
          resultMap[row.time] = { sno: row.sno, time: row.time, oldResult: '---', newResult: 'wait..' };
        }
        if (row.date === yesterdayStr) {
          resultMap[row.time].oldResult = row.newResult && row.newResult.toLowerCase() !== 'wait..' ? row.newResult : '---';
        }
        if (row.date === todayStr) {
          const rowMinutes = timeToMinutes(row.time);
          // Only show if current time has passed the scheduled time
          if (rowMinutes === -1 || currentMinutes >= rowMinutes) {
            resultMap[row.time].newResult = row.newResult;
          } else {
            resultMap[row.time].newResult = 'wait..';
          }
        }
      });

      res.json(Object.values(resultMap));
    } catch (error) {
      console.error('GET /api/results error:', error.message);
      res.status(500).json({ error: 'Unable to load results' });
    }
  });

  // ── Admin Routes ─────────────────────────────────────────────

  // GET all results (admin)
  app.get('/api/admin/results', requireAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;
      const skip = (page - 1) * limit;

      const results = await Result.find().sort({ date: -1, sno: -1 }).skip(skip).limit(limit);
      res.json(results);
    } catch (error) {
      console.error('GET /api/admin/results error:', error.message);
      res.status(500).json({ error: 'Unable to load admin results' });
    }
  });

  // POST create or update result (admin)
  app.post('/api/admin/results', requireAdmin, async (req, res) => {
    try {
      const { id, sno, game, time, oldResult, newResult, date } = req.body;
      const trimmedTime = (time || '').trim();

      if (!trimmedTime) {
        return res.status(400).json({ error: 'Time is required' });
      }

      const payload = {
        game:      (game      || 'MAHADEV LOTTERY').trim(),
        time:      trimmedTime,
        oldResult: (oldResult || '---').trim(),
        newResult: (newResult || 'wait..').trim(),
        date:      (date      || new Date().toISOString().split('T')[0]).trim()
      };

      // Update by _id if id provided
      if (id) {
        const existing = await Result.findById(id);
        if (!existing) {
          return res.status(404).json({ error: 'Result not found' });
        }
        Object.assign(existing, payload);
        if (sno && Number(sno) > 0) existing.sno = Number(sno);
        await existing.save();
        return res.json({ success: true, result: existing });
      }

      // Upsert by time and date if no id
      const existingTime = await Result.findOne({ time: trimmedTime, date: payload.date });
      if (existingTime) {
        Object.assign(existingTime, payload);
        if (sno && Number(sno) > 0) existingTime.sno = Number(sno);
        await existingTime.save();
        return res.json({ success: true, result: existingTime });
      }

      // Create new
      const nextSno = Number(sno) > 0
        ? Number(sno)
        : (await Result.countDocuments()) + 1;

      const created = await Result.create({ ...payload, sno: nextSno });
      return res.status(201).json({ success: true, result: created });

    } catch (error) {
      console.error('POST /api/admin/results error:', error.message);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ error: 'Validation failed', detail: error.message });
      }
      if (error.code === 11000) {
        return res.status(409).json({ error: 'A record with the same S.No or time already exists' });
      }
      res.status(500).json({ error: 'Unable to save result', detail: error.message });
    }
  });

  // PUT update result by id (admin)
  app.put('/api/admin/results/:id', requireAdmin, async (req, res) => {
    try {
      const { sno, game, time, oldResult, newResult, date } = req.body;

      const update = {};
      if (game)      update.game      = game.trim();
      if (time)      update.time      = time.trim();
      if (oldResult) update.oldResult = oldResult.trim();
      if (newResult) update.newResult = newResult.trim();
      if (date)      update.date      = date.trim();
      if (sno && Number(sno) > 0) update.sno = Number(sno);

      const row = await Result.findByIdAndUpdate(
        req.params.id,
        update,
        { new: true, runValidators: true }
      );

      if (!row) {
        return res.status(404).json({ error: 'Result not found' });
      }

      res.json({ success: true, result: row });

    } catch (error) {
      console.error('PUT /api/admin/results/:id error:', error.message);
      if (error.code === 11000) {
        return res.status(409).json({ error: 'S.No or time must remain unique' });
      }
      res.status(500).json({ error: 'Unable to update result' });
    }
  });

  // DELETE result by id (admin)
  app.delete('/api/admin/results/:id', requireAdmin, async (req, res) => {
    try {
      const deleted = await Result.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: 'Result not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('DELETE /api/admin/results/:id error:', error.message);
      res.status(500).json({ error: 'Unable to delete result' });
    }
  });

  // ── Catch-all (SPA fallback) ─────────────────────────────────
  app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}