const isAdmin = (req, res, next) => {
  if (req.user && req.user.app_role === "admin") return next();
  return res.status(403).json({ msg: "Admin only" });
};

const isManager = (req, res, next) => {
  if (req.user && ["admin", "manager"].includes(req.user.app_role)) return next();
  return res.status(403).json({ msg: "Managers only" });
};

const isVagos = (req, res, next) => {
  if (req.user && ["admin", "manager", "vagos"].includes(req.user.app_role)) return next();
  return res.status(403).json({ msg: "Vagos only" });
};

module.exports = { isAdmin, isManager, isVagos };
