// Backend entrypoint: creates the Express app and starts the HTTP server.
import createApp from "./app.js";

const PORT = Number(process.env.PORT || 5000);
const app = createApp();

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
