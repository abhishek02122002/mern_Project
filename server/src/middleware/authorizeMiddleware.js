const permissions = require("../constants/permissions");

const authorize = (requiredPermission) => {
    return (request, response, next) => {
        // Authmiddleware will run before this middleware
        const user = request.user;
        console.log(requiredPermission);
        console.log(user);

        if (!user) {
            return response.status(401).json({
                message: 'Unauthorized access'
            });
        }

        const userPermissions = permissions[user.role] || [];
        console.log(userPermissions);
        if (!userPermissions.includes(requiredPermission)) {
            return response.status(403).json({
                message: 'Forbidden: Insufficient Permission'
            });
        }

        next();
    };
};

module.exports = authorize;