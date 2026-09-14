import app from './api/index.js';

const PORT = Number(process.env.PORT || 4000);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
