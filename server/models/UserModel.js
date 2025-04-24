import { genSalt } from "bcrypt";
import mongoose from "mongoose";
import { hash } from "bcrypt";

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: false,
        unique: true,
        trim: true,
        default: "",
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true
    },
    password: {
        type: String,
        required: [true, "Password is required"]
    },
    firstName: {
        type: String,
        required: false
    },
    lastName: {
        type: String,
        required: false
    },
    profilePicture: {
        type: String,
        default: ""
    },
    color: {
        type: Number,
        required: false,
        default: 0
    },
    profileSetup: {
        type: Boolean,
        required: false,
        default: false
    },
});

userSchema.pre("save", async function (next) {
    const salt = await genSalt();
    this.password = await hash(this.password, salt);
    next();
});

const User = mongoose.model("user", userSchema);

export default User;
