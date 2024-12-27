export const createChatSlice = (set, get) => ({
    selectedChatType: undefined,
    selectedChatData: undefined,
    selectedChatMessages: [],
    directMessagesContacts: [],
    isUploading: false,
    isDownloading: false,
    fileUploadProgess: 0,
    fileDownloadProgess: 0,
    channels: [],
    setChannels: (channels) => {
        set({ channels });
    },
    setIsUploading: (isUploading) => {
        set({ isUploading });
    },
    setIsDownloading: (isDownloading) => {
        set({ isDownloading });
    },
    setFileUploadProgess: (fileUploadProgess) => {
        set({ fileUploadProgess });
    },
    setFileDownloadProgess: (fileDownloadProgess) => {
        set({ fileDownloadProgess });
    },
    setSelectedChatType: (selectedChatType) => {
        set({ selectedChatType });
    },
    setSelectedChatData: (selectedChatData) => {
        set({ selectedChatData });
    },
    setSelectedChatMessages: (selectedChatMessages) => {
        set({
            selectedChatMessages
        });
    },
    setDirectMessagesContacts: (directMessagesContacts) => {
        set({ directMessagesContacts });
    },
    addChannel: (channel) => {
        const channels = get().channels;
        set({ channels: [channel, ...channels] });
    },
    closeChat: () => {
        set({ selectedChatType: undefined, selectedChatData: undefined, selectedChatMessages: [] });
    },
    addMessage: (message) => {
        const selectedChatMessages = get().selectedChatMessages;
        const selectedChatType = get().selectedChatType;

        set({
            selectedChatMessages: [
                ...selectedChatMessages,
                {
                    ...message,
                    receiver:
                        selectedChatType === "channel"
                            ? message.receiver
                            : message.receiver._id,
                    sender:
                        selectedChatType === "channel"
                            ? message.sender
                            : message.sender._id,
                },
            ],
        });
    },
    addChannelInChannelList: (channel) => {
        const channels = get().channels;
        const data = channels.find((c) => c._id === channel.channelId);
        const index = channels.findIndex((c) => c._id === channel.channelId);
        console.log({ channels, data, index });
        if (index !== -1 && index !== undefined) {
            channels.splice(index, 1);
            channels.unshift(data);
        }
    },
    addContactsInDMContacts: (contact) => {
        const userId = get().userInfo.id;
        const from = contact.sender._id === userId ? contact.receiver._id : contact.sender._id;
        const fromData = contact.sender._id === userId ? contact.receiver : contact.sender;
        const dmContacts = get().directMessagesContacts;
        const index = dmContacts.findIndex((c) => c._id === from);
        if (index !== -1 && index !== undefined) {
            dmContacts.splice(index, 1);
            dmContacts.unshift(fromData);
        } else {
            dmContacts.unshift(fromData);
        }
        set({ directMessagesContacts: dmContacts });
    },

})