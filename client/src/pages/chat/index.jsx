import { useAppStore } from "@/store";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ContactsContainer from "./components/contacts-container";
import EmptyChatContainer from "./components/empty-chat-container";
import ChatContainer from "./components/chat-container";

const Chat = () => {
  const {
    userInfo,
    selectedChatType,
    isUploading,
    isDownloading,
    fileUploadProgess,
    fileDownloadProgess,
  } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!userInfo.profileSetup) {
      toast("Please Complete Your Profile To Continue!");
      navigate("/profile");
    }
  }, [userInfo, navigate]);

  return (
    <div className="flex h-[100vh] text-white overflow-hidden">
      {isUploading && (
        <div className="fixed h-[100vh] w-[100vw] top-0 left-0 z-[1000] bg-black/80 flex flex-col items-center justify-center gap-5 backdrop-blur-md">
          <h5 className="text-4xl animate-pulse">
            Uploading File {fileUploadProgess}%
          </h5>
        </div>
      )}
      {isDownloading && (
        <div className="fixed h-[100vh] w-[100vw] top-0 left-0 z-[1000] bg-black/80 flex flex-col items-center justify-center gap-5 backdrop-blur-md">
          <h5 className="text-4xl animate-pulse">
            Downloading File {fileDownloadProgess}%
          </h5>
        </div>
      )}
      <ContactsContainer />
      {selectedChatType ? <ChatContainer /> : <EmptyChatContainer />}
    </div>
  );
};

export default Chat;
