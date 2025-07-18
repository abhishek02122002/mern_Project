const jwt = require('jsonwebtoken');
const Users = require('../model/Users');

const authMiddleware = {
    protect: async (request, response, next) => {
        try {
            const token = request.cookies?.jwtToken;
            if (!token) {
                return response.status(401).json({
                    error: 'Unauthorized access'
                });
            }

            try {
                const user = jwt.verify(token, process.env.JWT_SECRET);
                const latestUser = await Users.findById({ _id: user.id });
                request.user = latestUser;
                next();
            } catch (error) {
                const refreshToken = request.cookies?.refreshToken;
                if(refreshToken){
                    const {newAccessToken}
                }
                return response.status(401).json({
                    error: 'Unauthorized access'
                });
            }
        } catch (error) {
            console.log(error);
            response.status(500).json({
                error: 'Internal server error'
            });
        }
    },
};

module.exports = authMiddleware;