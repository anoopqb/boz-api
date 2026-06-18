require('dotenv/config');
const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`boz-api listening on http://localhost:${PORT}`);
});
