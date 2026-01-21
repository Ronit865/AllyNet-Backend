import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Username is required'],
    trim: true,
    index: true,
    minlength: [3, 'Username must be at least 3 characters long']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: [true, 'Email must be unique'],
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long'],
    trim: true
  },
  role: {
    type: String,
    enum: ["admin", "alumni", "student"],
    default: "student",
  },
  avatar: {
    type: String,
    default: "https://api.dicebear.com/7.x/initials/svg?seed=User"
  },
  graduationYear: {
    type: Number,
  },
  course: {
    type: String,
    // default: null,
  },
  currentPosition: {
    type: String,
    default: null,
  },
  company: {
    type: String,
    default: null,
  },
  location: {
    type: String,
    default: null,
  },
  phone: {
    type: String,
    default: null,
  },
  bio: {
    type: String,
    maxlength: 500,
    default: null
  },
  linkedin: {
    type: String,
    default: null
  },
  github: {
    type: String,
    default: null
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  refreshToken: {
    type: String,
    default: null
  },
  resetPasswordOTP: {
    type: String,
  },
  resetPasswordExpires: {
    type: Date,
  },
  banStatus: {
    type: String,
    enum: ['active', 'temp_banned', 'suspended'],
    default: 'active'
  },
  banReason: {
    type: String,
    default: null
  },
  banExpiresAt: {
    type: Date,
    default: null
  },
  reportCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true })

// Add pre('save') middleware for individual document saves
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  // Hash the password before saving it to the database
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Correct pre('insertMany') middleware
userSchema.pre('insertMany', async function (next, docs) {
  try {
    if (docs && docs.length) {
      for (let doc of docs) {
        if (doc.password) {
          // Hash each document's password
          doc.password = await bcrypt.hash(doc.password, 10);
        }
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};
userSchema.methods.generateAccessToken = async function () {
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
userSchema.methods.generateRefreshToken = async function () {
  return jwt.sign({
    _id: this._id
  },
    process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY
  }
  );
};

const User = mongoose.model('User', userSchema);
export default User;