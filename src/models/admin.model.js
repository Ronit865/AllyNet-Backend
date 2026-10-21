import bcrypt from "bcrypt";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

const adminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    avatar: {
        type: String,
        default: "https://api.dicebear.com/7.x/initials/svg?seed=Admin"
    },
    role: {
        type: String,
        enum: ['admin', 'superadmin'],
        default: 'admin'
    },
    accessToken: {
        type: String
    },
    refreshToken: {
        type: String
    }
}, { timestamps: true });

adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  // Hash the password before saving it to the database
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

adminSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

adminSchema.methods.generateAccessToken = async function () {
  return jwt.sign({
    _id: this._id,
    email: this.email,
    name: this.name,
    role: this.role
  },
    process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY
  });
};

adminSchema.methods.generateRefreshToken = async function () {
  return jwt.sign({
    _id: this._id
  },
    process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY
  }
  );
};

const Admin = mongoose.model("Admin", adminSchema);

export default Admin;
