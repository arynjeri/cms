const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "../../.env")
});

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function recoverAdmin() {
  const { MONGODB_URI:MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  if (!MONGO_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error(
      "Set MONGO_URI, ADMIN_EMAIL and ADMIN_PASSWORD first."
    );
  }

  if (ADMIN_PASSWORD.length < 12) {
    throw new Error("Use a new password of at least 12 characters.");
  }

  await mongoose.connect(MONGO_URI);
  console.log(
    `Connected to MongoDB database "${mongoose.connection.name}" on "${mongoose.connection.host}".`
  );

  const email = ADMIN_EMAIL.trim().toLowerCase();
  let user = await User.findOne({ email });
  const adminCount = await User.countDocuments({ role: "admin" });

  if (user && user.role !== "admin") {
    throw new Error(
      "That email belongs to a non-admin account. No changes made."
    );
  }

  if (!user && adminCount > 0) {
    throw new Error(
      "An admin already exists. Use the correct existing admin email."
    );
  }

const creating = !user;

if (creating) {
  user = new User({
    name: process.env.ADMIN_NAME || "Administrator",
    email,
    passwordHash: ADMIN_PASSWORD,
    role: "admin"
  });
} else {
  user.passwordHash = ADMIN_PASSWORD;
}

await user.save();

if (!(await bcrypt.compare(ADMIN_PASSWORD, user.passwordHash))) {
  throw new Error("Saved password could not be verified.");
}

console.log(
  creating
    ? "First admin created successfully."
    : "Existing admin password reset successfully."
);
}

recoverAdmin()
  .catch((err) => {
    console.error("Recovery failed:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });

// Set ADMIN_EMAIL, ADMIN_PASSWORD, and ADMIN_NAME in the environment before
// running this script.
