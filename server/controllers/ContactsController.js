import { mongo } from "mongoose";
import User from "../models/UserModel.js";
import Message from "../models/MessagesModel.js";

export const searchContacts = async (req, res, next) => {
    try {
        const { searchTerm } = req.body;
        if (searchTerm === undefined || searchTerm === null) {
            return res.status(400).json({ message: "Search Term Required" });
        }

        const sanitizedSearchTerm = searchTerm.replace(/[.*+?^$(){}|[\]\\]/g, "\\$&");

        const regex = new RegExp(sanitizedSearchTerm, "i");
        
        const usernameRegex = /^[a-zA-Z][a-zA-Z0-9._@$]*$/;

        const contacts = await User.find({
            $and: [
                { _id: { $ne: req.userId } },
                {
                    $or: [
                        { firstName: regex },
                        { lastName: regex },
                        { email: regex },
                        { username: usernameRegex.test(searchTerm) ? searchTerm : "" }
                    ]
                }
            ]
        });

        return res.status(200).json({ contacts });

    }
    catch (error) {
        console.error({ error });
        return res.status(500).send("Internal Server Error");
    }
};

export const getContactsForDMList = async (req, res, next) => {
    try {
        let { userId } = req;
        userId = new mongo.ObjectId(userId);

        const contacts = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { sender: userId },
                        { receiver: userId }
                    ]
                }
            },
            {
                $sort: { createdAt: -1 }
            },
            {
                $group: {
                    _id: {
                        $cond: {
                            if: { $eq: ["$sender", userId] },
                            then: "$receiver",
                            else: "$sender"
                        }
                    },
                    lastMessageTime: { $first: "$createdAt" }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "sender",
                    foreignField: "_id",
                    as: "sender"
                }
            },
            {
                $lookup: {
                    from: "users",
                    // localField: "receiver",
                    localField: "_id",
                    foreignField: "_id",
                    // as: "receiver"
                    as: "contactInfo"
                }
            },
            {
                $unwind: "$contactInfo"
            },
            {
                $project: {
                    _id: 1,
                    email: "$contactInfo.email",
                    firstName: "$contactInfo.firstName",
                    lastName: "$contactInfo.lastName",
                    username: "$contactInfo.username",
                    profilePicture: "$contactInfo.profilePicture",
                    color: "$contactInfo.color",
                    lastMessageTime: 1
                }
            },
            {
                $sort: { lastMessageTime: -1 }
            }
        ]);

        return res.status(200).json({ contacts });

    }
    catch (error) {
        console.error({ error });
        return res.status(500).send("Internal Server Error");
    }
};

export const getAllContacts = async (req, res, next) => {
    try {
        const users = await User.find({ _id: { $ne: req.userId } }, "_id email firstName lastName");

        const contacts = users.map((user) => ({
            label: user.firstName ? `${user.firstName} ${user.lastName}` : user.email,
            value: user._id
        }));

        return res.status(200).json({ contacts });
    }
    catch (error) {
        console.error({ error });
        return res.status(500).send("Internal Server Error");
    }
};