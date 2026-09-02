const app = require('../backend/dist/server.js');
module.exports = app.default || app;
