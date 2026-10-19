/**
 * Role-based access control middleware
 * @param  {...string} roles Allowed roles ('admin', 'owner', 'viewer')
 */
const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required before checking roles.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access Denied: Requires one of [${roles.join(', ')}] roles. Your role is '${req.user.role}'.`,
      });
    }

    next();
  };
};

module.exports = authorizeRole;
