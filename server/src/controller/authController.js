const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Users = require("../model/Users");
const { OAuth2Client } = require("google-auth-library");
const { validationResult } = require("express-validator");
const { attemptToRefreshToken } = require("../util/authUtil");

// https://www.uuidgenerator.net/
const secret = process.env.JWT_SECRET;

const authController = {
  login: async (request, response) => {
    try {
      // const errors = validationResult(request);
      // if (!errors.isEmpty()) {
      //     return response.status(401).json({ errors: errors.array(),
      //         message:"yha error hai bhai"
      //      });
      // }

      // The body contains username and password because of the express.json()
      // middleware configured in the server.js
      const { username, password } = request.body;

      // Call Database to fetch user by the email
      const data = await Users.findOne({ email: username });
      if (!data) {
        return response.status(401).json({ message: "Invalid credentials " });
      }

      const isMatch = await bcrypt.compare(password, data.password);
      if (!isMatch) {
        return response.status(401).json({ message: "Invalid credentials " });
      }

      const user = {
        id: data._id,
        name: data.name,
        email: data.email,
        role: data.role ? data.role : "admin",
        adminId: data.adminId,
        credits: data.credits,
        subscription: data.subscription,
      };

      const token = jwt.sign(user, secret, { expiresIn: "1h" });
      response.cookie("jwtToken", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        path: "/",
        sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      });

      response.json({ user: user, message: "User authenticated" });
    } catch (error) {
      console.log(error);
      response.status(500).json({ error: "Internal server error" });
    }
  },

  logout: (request, response) => {
    response.clearCookie("jwtToken");
    response.json({ message: "Logout successfull" });
  },

  isUserLoggedIn: (request, response) => {
    const token = request.cookies.jwtToken;

    if (!token) {
      return response.status(401).json({ message: "Unauthorized access" });
    }

    jwt.verify(token, secret, async (error, user) => {
      if (error) {
        return response.status(401).json({ message: "Unauthorized access" });
      } else {
        const latestUserDetails = await Users.findById({ _id: user.id });
        response.json({
          message: "User is logged in",
          user: latestUserDetails,
        });
      }
    });
  },

  register: async (request, response) => {
    try {
      // Extract attributes from the request body
      const { username, password, name } = request.body;
      console.log("data aaya", username, password, name);

      // Firstly check if user already exist with the given email
      const data = await Users.findOne({ email: username });
      if (data) {
        return response
          .status(401)
          .json({ message: "Account already exist with given email" });
      }

      // Encrypt the password before saving the record to the database
      const encryptedPassword = await bcrypt.hash(password, 10);

      // Create mongoose model object and set the record values
      const user = new Users({
        email: username,
        password: encryptedPassword,
        name: name,
        role: "admin",
      });
      await user.save();
      const userDetails = {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        credits: user.credits,
      };
      const token = jwt.sign(userDetails, secret, { expiresIn: "1h" });

      response.json({ message: "User registered", user: userDetails });
    } catch (error) {
      console.log(error);
      return response.status(500).json({ error: "Internal Server Error" });
    }
  },

  googleAuth: async (request, response) => {
    try {
      const { idToken } = request.body;
      if (!idToken) {
        return response.status(401).json({ message: "Invalid request" });
      }

      const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
      const googleResponse = await googleClient.verifyIdToken({
        idToken: idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = googleResponse.getPayload();
      const { sub: googleId, name, email } = payload;

      let data = await Users.findOne({ email: email });
      if (!data) {
        data = new Users({
          email: email,
          name: name,
          isGoogleUser: true,
          googleId: googleId,
          role: "admin",
        });
        await data.save();
      }

      const user = {
        id: data._id ? data._id : googleId,
        username: email,
        name: name,
        role: data.role ? data.role : "admin", // This is the ensure backward compatibility
        credits: data.credits,
      };

      const token = jwt.sign(user, secret, { expiresIn: "1h" });

      const refreshToken = jwt.sign(user, process.env.JWT_REFRESH_SECRET, {
        expiresIn: "7d",
      });
      response.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: true,
        domain: "localhost",
        path: "/",
      });

      response.json({ user: user, message: "User authenticated" });
    } catch (error) {
      console.log(error);
      return response.status(500).json({ message: "Internal server error" });
    }
  },

  refreshToken: (request, response) => {
    const refreshToken = request.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({
        message: "No refresh token is given",
      });
    }
    jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET,
      async (err, userDetails) => {
        if (err) {
          return response
            .status(401)
            .json({ message: "Invalid refresh token" });
        }
        // user ki details ko get krna
        const userRecords = await Users.findById(userDetails.id);

        if (!userRecords) {
          return response.status(404).json({
            message: "user nahi hai ",
          });
        }

        const updateduser = {
          id: userRecords._id,
          name: userRecords.name,
          email: userRecords.name,
          role: userRecords.role,
          credits: userRecords.credits,
        };
        const newAccessToken = jwt.sign(updateduser, process.env.JWT_SECRET, {
          expiresIn: "7d",
        });
        response.cookie("jwtToken", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          path: "/",
          sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        });

        response.json({ message: "Acess token refreshed", user: updateduser });
      }
    );
  },
};

module.exports = authController;
