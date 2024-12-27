import Message from "../models/MessagesModel.js";
import { mkdirSync, renameSync } from 'fs';

export const getMessages = async (req, res, next) => {
    try {
        const user1 = req.userId;
        const user2 = req.body.id;

        // if (!user1) {
        //     return res.status(400).json({ message: "Sender's User ID Required" });
        // }

        if (!user2 || !user2) {
            return res.status(400).json({ message: "Both User IDs Required" });
        }

        const messages = await Message.find({
            $or: [
                { sender: user1, receiver: user2 },
                { sender: user2, receiver: user1 }
            ]
        }).sort({ createdAt: 1 });

        return res.status(200).json({ messages });

    }
    catch (error) {
        console.error({ error });
        return res.status(500).send("Internal Server Error");
    }
};

export const uploadFile = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "File Required" });
        }

        const date = Date.now();
        let fileDIR = `uploads/files/${date}`;
        let fileName = `${fileDIR}/${req.file.originalname}`;

        mkdirSync(fileDIR, { recursive: true });

        renameSync(req.file.path, fileName);

        return res.status(200).json({ fileURL: fileName });
    }
    catch (error) {
        console.error({ error });
        return res.status(500).send("Internal Server Error");
    }
};