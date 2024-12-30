import User from "../models/UserModel.js";
import jwt from "jsonwebtoken";
import { compare } from "bcrypt";
import { renameSync, unlinkSync } from "fs";
// import { profile } from "console";



const maxAge = 3 * 24 * 60 * 60 * 1000;

const createToken = (email, userId) => {
    return jwt.sign({ email, userId }, process.env.JWT_KEY, {
        expiresIn: maxAge
    });
}

export const register = async (req, res, next) => {
    try {
        // const { username, email, password } = req.body;
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "All Fields Are Required" });
        }
        const user = await User.create({ email, password });
        res.cookie("jwt", createToken(user.email, user._id), {
            maxAge,
            sameSite: "None",
            secure: true
        });
        return res.status(201).json({
            user: {
                id: user._id,
                email: user.email,
                profileSetup: user.profileSetup
            }
        });
    } catch (error) {
        console.log({ error });
        return res.status(500).send("Internal Server Error");
    }
};

export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Invalid Credentials" });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User With This Email Does Not Exist" });
        }
        const isMatch = await compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect Password" });
        }
        res.cookie("jwt", createToken(user.email, user._id, user.username), {
            maxAge,
            sameSite: "None",
            secure: true
        });
    return res.status(200).json({
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                profileSetup: user.profileSetup
            }
        });
    }
    catch (error) {
        console.log({ error });
        return res.status(500).send("Internal Server Error");
    }
};

export const getUserInfo = async (req, res, next) => {
    try {
        const userData = await User.findById(req.userId);
        if (!userData) {
            return res.status(400).json({ message: "User Not Found" });
        }
        return res.status(200).json({
            id: userData._id,
            username: userData.username,
            email: userData.email,
            profileSetup: userData.profileSetup,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profilePicture: userData.profilePicture,
            color: userData.color
        });
    }
    catch (error) {
        console.log({ error });
        return res.status(500).send("Internal Server Error");
    }
};

export const updateProfile = async (req, res, next) => {
    try {
        const { userId } = req;
        const { username, firstName, lastName, color } = req.body;
        if (!username || !firstName || !lastName) {
            return res.status(400).json({ message: "All Fields Are Required" });
        }
        const userData = await User.findByIdAndUpdate(userId, {
            username,
            firstName,
            lastName,
            color,
            profileSetup: true
        }, { new: true, runValidators: true });
        if (!userData) {
            return res.status(400).json({ message: "User Not Found" });
        }
        return res.status(200).json({
            id: userData._id,
            username: userData.username,
            email: userData.email,
            profileSetup: userData.profileSetup,
            firstName: userData.firstName,
            lastName: userData.lastName,
            profilePicture: userData.profilePicture,
            color: userData.color
        });
    }
    catch (error) {
        console.log({ error });
        return res.status(500).send("Internal Server Error");
    }
};

export const addProfileImage = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "Profile Picture Is Required" });
        }

        const date = Date.now();
        let fileName = "uploads/profiles/" + date + req.file.originalname;
        renameSync(req.file.path, fileName);

        const updatedUser = await User.findByIdAndUpdate(req.userId, {
            profilePicture: fileName,
        }, { new: true, runValidators: true });

        updatedUser.profilePicture = fileName;
        await updatedUser.save();

        return res.status(200).json({
            profilePicture: updatedUser.profilePicture
        });
    }
    catch (error) {
        console.log({ error });
        return res.status(500).send("Internal Server Error");
    }
};

export const deleteProfileImage = async (req, res, next) => {
    try {
        const { userId } = req;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({ message: "User Not Found" });
        }
        if (user.profilePicture) {
            unlinkSync(user.profilePicture);
        }
        user.profilePicture = null;
        await user.save();

        return res.status(200).json({ message: "Profile Picture Deleted Successfully" });
    }
    catch (error) {
        console.log({ error });
        return res.status(500).send("Internal Server Error");
    }
};

export const logout = async (req, res, next) => {
    try {
        res.cookie("jwt", "", { maxAge: 1, sameSite: "None", secure: true });

        return res.status(200).json({ message: "Logged Out Successfully!" });
    }
    catch (error) {
        console.log({ error });
        return res.status(500).send("Internal Server Error");
    }
};