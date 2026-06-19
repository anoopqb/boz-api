const express = require('express');
const propertiesRouter = require('./routes/properties');

const app = express();

app.use(express.json());

app.get('/', (_req, res) => res.send('boz-api is running'));

app.use('/properties', propertiesRouter);

module.exports = app;
