// utils/jwtState.js
import jwt from "jsonwebtoken";

export const makeState = (payload, expiresIn = "10m") => {
  return jwt.sign(payload, process.env.JWT_STATE_SECRET, { expiresIn });
};

export const verifyState = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_STATE_SECRET);
  } catch (err) {
    return null;
  }
};
