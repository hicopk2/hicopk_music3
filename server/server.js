// Main server entry point
const express = require('express');
const app = express();

// Middleware and routes will be initialized here

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;