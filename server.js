// server.js — ParkPass
// Serves all HTML/CSS/JS from /public and exposes POST /api/reserve

const express = require("express");
const path    = require("path");

const app  = express();
const PORT = 3000;

// ── Middleware ────────────────────────────────────────────────
app.use(express.json());

// Serve everything inside /public (home.html, parking.html, book.html,
// account.html, index.html, all CSS and JS files)
app.use(express.static(path.join(__dirname, "public")));

// ── Root redirect → index.html (the reservation form) ────────
// Express static already handles this, but being explicit:
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── API: Parking reservation ──────────────────────────────────
app.post("/api/reserve", async (req, res) => {
  try {
    const { firstName, lastName, email, phone, plate, startTime, endTime } = req.body;

    // Basic validation
    if (!firstName || !lastName || !email || !phone || !plate || !startTime || !endTime) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const payload = {
      firstName,
      lastName,
      email,
      phoneNumber: phone,
      mediums: [
        {
          type: "LICENSEPLATE",
          encoding: "HEX",
          value: plate.toUpperCase(),
          licencePlateRegion: {
            code: plate.substring(0, 2).toUpperCase(),
            country: "SVK",
          },
          status: "VALIDATED",
        },
      ],
      visit: {
        startTime,
        endTime,
        contractBusinessId: "A2026X0qTl9Woq",
        productBusinessId:  "PP000037",
        facilitiesBusinessId: ["FC2754897"],
      },
    };

    const response = await fetch(
      "http://localhost:9080/customers-contracts/v2/de_studentui/consumers/visitor",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    res.json(data);
  } catch (error) {
    console.error("Reserve error:", error);
    res.status(500).json({ message: "Server error. Is the parking API running on port 9080?" });
  }
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════╗
  ║   ParkPass server running            ║
  ║   http://localhost:${PORT}               ║
  ║                                      ║
  ║   Pages:                             ║
  ║   /              → index.html        ║
  ║   /home.html     → Home              ║
  ║   /parking.html  → Parking map       ║
  ║   /book.html     → Book tickets      ║
  ║   /account.html  → Account           ║
  ║                                      ║
  ║   API:                               ║
  ║   POST /api/reserve                  ║
  ╚══════════════════════════════════════╝
  `);
});
