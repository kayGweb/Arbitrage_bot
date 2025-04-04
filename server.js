const express = require("express");
const path = require("path");
const http = require("http");
const cors = require("cors");
const { createProxyMiddleware } = require("http-proxy-middleware");
const db = require("./database/db");

// SERVER CONFIG
const PORT = process.env.PORT || 4000;
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({ credentials: true, origin: "*" }));
app.use(express.json());

// API Routes
app.use("/api", require("./api/api-routes.js"));

// Serve frontend in production
if (process.env.NODE_ENV === "production") {
	app.use(express.static(path.join(__dirname, "frontend/out")));
	app.get("*", (req, res) => {
		res.sendFile(path.join(__dirname, "frontend/out/index.html"));
	});
} else {
	// Proxy frontend requests to Next.js dev server in development
	app.use(
		"/",
		createProxyMiddleware({
			target: "http://localhost:3000",
			changeOrigin: true,
			ws: true
		})
	);
}

// Initialize database before starting server
db.initialize()
	.then(() => {
		server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

		// Log success message
		console.log(`Server running at http://localhost:${PORT}`);
		console.log(`API available at http://localhost:${PORT}/api`);
	})
	.catch((err) => {
		console.error("Failed to initialize database:", err);
		process.exit(1);
	});
