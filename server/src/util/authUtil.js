const jwt = require("jsonwebtoken");
const { default: subscriptions } = require("razorpay/dist/types/subscriptions");
const Users = require("../model/Users");
require("dotenv").config();
const refreshSecret = process.env.JWT_REFRESH_SECRET;
const secret = JWT_SECRET;

const attemptToFreshToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, refreshSecret);

    // fetch the latest data from the db as across 7 days of
    // refreshToken lifecycle, user details like crdits ,susbcriptions
    const data = await Users.findById({ _id: decoded.id });
    const user = {
      id: data._id,
      username: data.email,
      name: data.name,
      role: data.role ? data.role : "admin",
      credits: data.credits,
      subscription: data.subscription,
    };
    const newAccessToken = jwt.sign(user, secret, { expiresIn: "1m" });
    return {newAccessToken,user};
  } catch (err) {
    console.log(err);
    throw err;
  }
};

module.exports = { attemptToFreshToken };
