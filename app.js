require("dotenv").config();
require("./auth/passport");

const express = require("express");
const session = require("express-session");
const passport = require("passport");
const cors = require("cors");
const path = require("path");
const morgan = require("morgan");
const exphbs = require("express-handlebars");

const app = express();

// ==============
// MIDDLEWARES
// ==============

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("dev"));

app.use(session({
  secret: process.env.SESSION_SECRET || "supersecret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// ==============
// STATIC FILES
// ==============

app.use(express.static(path.join(__dirname, "Frontend")));
app.use("/assets", express.static(path.join(__dirname, "assets")));

// ==============
// VIEW ENGINE SETUP (Handlebars + Helpers)
// ==============

const hbs = exphbs.create({
  extname: '.hbs',
  partialsDir: path.join(__dirname, "views/partials"),
  helpers: {
    eq: (a, b) => a === b,
    or: function (...args) {
      args.pop(); // Remove Handlebars options object
      return args.some(Boolean);
    },
    and: function (...args) {
      args.pop();
      return args.every(Boolean);
    },
    not: value => !value
  }
});

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set("views", path.join(__dirname, "views"));

// ==============
// ROUTES
// ==============

const mainRoutes = require("./routes/routes");
const authRoutes = require("./auth/authRoutes");

app.use("/", mainRoutes);
app.use("/", authRoutes);

// ==============
// API ENDPOINTS
// ==============

app.get("/api/user", (req, res) => {
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ message: "Not logged in" });
  }
});

// ==============
// ERROR HANDLING
// ==============

app.use((req, res) => {
  res.status(404).render("error", {
    title: "Page Not Found",
    message: "404 - Page Not Found"
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).render("error", {
    title: "Internal Server Error",
    message: err.message,
    error: process.env.NODE_ENV === "development" ? err : {}
  });
});

// ==============
// START SERVER
// ==============

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
