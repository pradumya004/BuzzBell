import mongoose from "mongoose";
import User from "./UserModel.js";

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: false,
    },
    messageType: {
        type: String,
        enum: ["text", "image", "video", "audio", "file"],
        required: true,
    },
    content: {
        type: String,
        required: function () {
            return this.messageType === "text";
        },
    },
    fileURL: {
        type: String,
        required: function () {
            return this.messageType === "file";
        },
    },
    // read: {
    //     type: Boolean,
    //     default: function () {
    //         return this.messageType === "text";
    //     },
    // },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Message = mongoose.model("Messages", messageSchema);

export default Message;

