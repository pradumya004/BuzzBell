import { Server as SocketIOServer } from "socket.io";
import Message from "./models/MessagesModel.js";
import Channel from "./models/ChannelModel.js";

const setupSocket = (server) => {
    const io = new SocketIOServer(server, {
        cors: {
            origin: process.env.ORIGIN,
            methods: ["GET", "POST"],
            credentials: true,
        }
    });

    const userSocketMap = new Map();

    const disconnect = (socket) => {
        console.log("\nSocket Disconnected: " + socket.id);
        for (const [key, value] of userSocketMap.entries()) {
            if (value === socket.id) {
                userSocketMap.delete(key);
                console.log("Client Disconnected: " + key);
                break;
            }
        }
    }

    const sendMessage = async (message) => {
        try {
            const senderSocketId = userSocketMap.get(message.sender);
            const receiverSocketId = userSocketMap.get(message.receiver);

            const createdMessage = await Message.create(message);

            const messageData = await Message.findById(createdMessage._id).populate("sender", "id email firstName lastName username profilePicture color").populate("receiver", "id email firstName lastName username profilePicture color");

            if (receiverSocketId) {
                io.to(receiverSocketId).emit("receiveMessage", messageData);
            } else {
                console.log("Receiver Not Connected");
            }

            if (senderSocketId) {
                io.to(senderSocketId).emit("receiveMessage", messageData);
            } else {
                console.log("Sender Not Connected");
            }
        } catch (error) {
            console.error({ error });
        }
    }

    const sendChannelMessage = async (message) => {
        try {
            const { channelId, sender, content, messageType, fileURL } = message;

            const createdMessage = await Message.create({
                sender,
                receiver: null,
                messageType,
                content,
                fileURL,
                createdAt: new Date()
            });

            const messageData = await Message.findById(createdMessage._id).populate("sender", "id email firstName lastName username profilePicture color").exec();

            await Channel.findByIdAndUpdate(channelId, { $push: { messages: createdMessage._id } });

            const channel = await Channel.findById(channelId).populate("members");

            const finalData = { ...messageData._doc, channelId: channel._id };

            if (channel && channel.members) {
                channel.members.forEach((member) => {
                    const memberSocketId = userSocketMap.get(member._id.toString());

                    if (memberSocketId) {
                        io.to(memberSocketId).emit("receive-channel-message", finalData);
                    }
                });
                // const adminSocketId = userSocketMap.get(channel.admin._id.toString());

                // if (adminSocketId) {
                //     io.to(adminSocketId).emit("receive-channel-message", finalData);
                // }
            }
        } catch (error) {
            console.error({ error });
        }
    };

    io.on("connection", (socket) => {
        const userId = socket.handshake.query.userId;

        if (userId) {
            userSocketMap.set(userId, socket.id);
            console.log("\nUser Connected: " + userId + " With Socket ID: " + socket.id);

        } else {
            console.log("User ID Not Provided During Connection");
        }

        socket.on("sendMessage", sendMessage);
        socket.on("send-channel-message", sendChannelMessage);
        socket.on("disconnect", () => disconnect(socket));
    });
};

export default setupSocket;