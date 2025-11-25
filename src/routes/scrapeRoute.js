const express = require('express');
const router = express.Router();
const scrapeController = require('../controllers/scrapeController');

// POST /scrape
router.post('/', scrapeController);

module.exports = router;


