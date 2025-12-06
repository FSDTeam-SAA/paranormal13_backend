import crypto from "crypto";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import validator from "validator";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please tell us your name!"],
    },
    email: {
      type: String,
      lowercase: true,
      unique: true,
      sparse: true, // <--- ALLOWS MULTIPLE NULL VALUES
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    phone: {
      type: String,
      unique: true,
      sparse: true, // <--- ALLOWS MULTIPLE NULL VALUES
    },
    role: {
      type: String,
      enum: ["patient", "doctor", "pharmacist", "admin"],
      default: "patient",
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 8,
      select: false,
    },
    // ... rest of your fields (refreshToken, avatarUrl, etc.) keep them same ...
    refreshToken: {
      type: String,
      select: false,
    },
    refreshTokenExpires: {
      type: Date,
      select: false,
    },
    avatarUrl: {
      type: String,
      default: "default.jpg",
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "other",
    },
    dateOfBirth: Date,
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
      address: String,
    },
    specialization: String,
    experienceYears: Number,
    about: String,
    hospitalName: String,
    doctorStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    pharmacyName: String,
    passwordChangedAt: Date,
    passwordResetCode: String,
    passwordResetExpires: Date,
    active: {
      type: Boolean,
      default: true,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

userSchema.index({ location: "2dsphere" });

userSchema.pre("validate", function (next) {
  if ((!this.email || this.email.trim() === "") && (!this.phone || this.phone.trim() === "")) {
    return next(new Error("You must provide either an Email OR a Phone number to sign up."));
  }
  next();
});


userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.createPasswordResetCode = function () {
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  this.passwordResetCode = crypto
    .createHash("sha256")
    .update(resetCode)
    .digest("hex");
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  return resetCode;
};

const User = mongoose.model("User", userSchema);
export default User;