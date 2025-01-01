import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import authRoutes from './routes/AuthRoutes.js';
import contactRoutes from './routes/ContactsRoutes.js';
import messageRoutes from './routes/MessagesRoutes.js';
import channelRoutes from './routes/ChannelRoutes.js';
import setupSocket from './socket.js';
import path from 'path';

import './models/UserModel.js';
import './models/MessagesModel.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const databaseURL = process.env.DATABASE_URL;

const _dirname = path.resolve();

app.use(
    cors({
        // origin: [process.env.ORIGIN],
        origin: "https://buzzbell.onrender.com",
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    })
);

app.use("/uploads/profiles", express.static("uploads/profiles"));
app.use("/uploads/files", express.static("uploads/files"));

app.use(cookieParser());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/channel", channelRoutes);

app.use(express.static(path.join(_dirname, '/client/dist')));
app.get('*', (_, res) => {
    res.sendFile(path.join(_dirname, 'client', 'dist', 'index.html'));
});

const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

setupSocket(server);

mongoose.connect(databaseURL).then(() => {
    console.log('Database is connected!');
}).catch((error) => {
    console.log(error.message);
});

const connection = mongoose.connection;