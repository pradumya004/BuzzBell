import { apiClient } from "@/lib/api-client";
import { useAppStore } from "@/store";
import {
  GET_ALL_MESSAGES_ROUTE,
  GET_CHANNEL_MESSAGES_ROUTE,
  HOST,
} from "@/utils/constants";
import moment from "moment";
import { useEffect, useRef, useState } from "react";
import { FaDownload } from "react-icons/fa";
import { FcFolder } from "react-icons/fc";
import { IoCloseSharp } from "react-icons/io5";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getColor } from "@/lib/utils";

const MessageContainer = () => {
  const scrollRef = useRef(null);
  const {
    selectedChatType,
    selectedChatData,
    selectedChatMessages,
    setSelectedChatMessages,
    setIsDownloading,
    setFileDownloadProgess,
    userInfo,
  } = useAppStore();

  const [showImage, setShowImage] = useState(false);
  const [imageURL, setImageURL] = useState(null);

  useEffect(() => {
    const getMessages = async () => {
      try {
        const res = await apiClient.post(
          GET_ALL_MESSAGES_ROUTE,
          {
            id: selectedChatData._id,
          },
          { withCredentials: true }
        );

        if (res.data.messages) {
          setSelectedChatMessages(res.data.messages);
        }
      } catch (error) {
        console.log({ error });
      }
    };

    const getChannelMessages = async () => {
      try {
        const res = await apiClient.get(
          `${GET_CHANNEL_MESSAGES_ROUTE}/${selectedChatData._id}`,
          {
            withCredentials: true,
          }
        );

        if (res.data.messages) {
          setSelectedChatMessages(res.data.messages);
        }
      } catch (error) {
        console.log({ error });
      }
    };

    if (selectedChatData._id) {
      if (selectedChatType === "contact") {
        getMessages();
      } else if (selectedChatType === "channel") {
        getChannelMessages();
      }
    }
  }, [selectedChatData, selectedChatType, setSelectedChatMessages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedChatMessages]);

  const checkIfImage = (fileURL) => {
    const imageRegex = /\.(gif|jpe?g|tiff?|png|webp|bmp|svg|ico|heic|heif)$/i;
    return imageRegex.test(fileURL);
  };

  const renderMessages = () => {
    let lastDate = null;
    return selectedChatMessages.map((message, index) => {
      const messageDate = moment(message.createdAt).format("YYYY-MM-DD");
      const showDate = lastDate !== messageDate;
      lastDate = messageDate;

      return (
        <div key={index}>
          {showDate && (
            <div className="text-center text-neutral-500 my-2">
              {moment(message.createdAt).format("LL")}
            </div>
          )}
          {selectedChatType === "contact" && renderDMMessages(message)}
          {selectedChatType === "channel" && renderChannelMessages(message)}
        </div>
      );
    });
  };

  const downloadFile = async (file) => {
    try {
      setIsDownloading(true);
      setFileDownloadProgess(0);
      const res = await apiClient.get(`${HOST}/${file}`, {
        withCredentials: true,
        responseType: "blob",
        onDownloadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded / progressEvent.total) * 100
          );
          setFileDownloadProgess(progress);
        },
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", file.split("/").pop());
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setIsDownloading(false);
      setFileDownloadProgess(0);
    } catch (error) {
      setIsDownloading(false);
      setFileDownloadProgess(0);
      console.log({ error });
    }
  };

  // const renderDMMessages = (message) => (
  //   <div
  //     className={`${
  //       message.sender === selectedChatData._id ? "text-left" : "text-right"
  //     }`}
  //   >
  //     {message.messageType === "text" && (
  //       <div
  //         className={`${
  //           message.sender !== selectedChatData._id
  //             ? "bg-purple-700 text-white/90 border-none"
  //             : "bg-[#344151] text-white/90 border-none"
  //         } border inline-block pl-2 pr-2 pt-1 pb-1 rounded-md my-1 max-w-[50%] break-words`}
  //       >
  //         {message.content}
  //       </div>
  //     )}
  //     {message.messageType === "file" && (
  //       <div
  //         className={`${
  //           message.sender !== selectedChatData._id
  //             ? "bg-purple-700 bg-opacity-40 text-white/90 border-white/10"
  //             : "bg-[#344151]/10 text-white/90 border-white/10"
  //         } border inline-block p-2 rounded-md my-1 max-w-[50%] break-words`}
  //       >
  //         {checkIfImage(message.fileURL) ? (
  //           <div
  //             className="cursor-pointer"
  //             onClick={() => {
  //               setShowImage(true);
  //               setImageURL(message.fileURL);
  //             }}
  //           >
  //             <img
  //               src={`${HOST}/${message.fileURL}`}
  //               alt="file"
  //               className="w-[200px] h-[200px]"
  //             />
  //           </div>
  //         ) : (
  //           <div className="flex items-center justify-center gap-2">
  //             <span className="text-white/80 text-xl bg-black/20 rounded-md p-1">
  //               {/* <MdOutlineFolderZip /> */}
  //               <FcFolder />
  //             </span>
  //             <span>{message.fileURL.split("/").pop()}</span>
  //             <span
  //               className="rounded-md p-1 cursor-pointer text-lg hover:bg-black/50 transition-all duration-300"
  //               onClick={() => downloadFile(message.fileURL)}
  //             >
  //               <FaDownload />
  //             </span>
  //           </div>
  //         )}
  //       </div>
  //     )}
  //     <div className="text-xs text-gray-600">
  //       {moment(message.createdAt).format("LT")}
  //     </div>
  //   </div>
  // );

  const renderDMMessages = (message) => {
    return (
      <div className="flex flex-col">
        <div
          className={`flex ${
            message.sender !== selectedChatData._id
              ? "justify-end"
              : "justify-start"
          }`}
        >
          {message.messageType === "text" && (
            <div
              className={`${
                message.sender !== selectedChatData._id
                  ? "bg-purple-700 text-white/90"
                  : "bg-[#344151] text-white/90"
              } pl-2 pr-2 pt-1 pb-1 rounded-md my-1 max-w-[50%] break-words`}
            >
              {message.content}
            </div>
          )}
          {message.messageType === "file" && (
            <div
              className={`${
                message.sender !== selectedChatData._id
                  ? "bg-purple-700 bg-opacity-40 text-white/90 border-white/10"
                  : "bg-[#344151]/10 text-white/90 border-white/10"
              } border p-2 rounded-md my-1 max-w-[50%] break-words`}
            >
              {checkIfImage(message.fileURL) ? (
                <div
                  className="cursor-pointer"
                  onClick={() => {
                    setShowImage(true);
                    setImageURL(message.fileURL);
                  }}
                >
                  <img
                    src={`${HOST}/${message.fileURL}`}
                    alt="file"
                    className="w-[200px] h-[200px]"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-white/80 text-xl bg-black/20 rounded-md p-1">
                    <FcFolder />
                  </span>
                  <span>{message.fileURL.split("/").pop()}</span>
                  <span
                    className="rounded-md p-1 cursor-pointer text-lg hover:bg-black/50 transition-all duration-300"
                    onClick={() => downloadFile(message.fileURL)}
                  >
                    <FaDownload />
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <div
          className={`text-xs text-gray-600 ${
            message.sender !== selectedChatData._id ? "text-right" : "text-left"
          } mb-2`}
        >
          {moment(message.createdAt).format("LT")}
        </div>
      </div>
    );
  };

  const renderChannelMessages = (message) => {
    const isSender = message.sender._id === userInfo.id; // Check if the current user is sender
    return (
      <div className="flex flex-col">
        {/* Message Container */}
        <div
          className={`flex items-start ${
            isSender ? "justify-end" : "justify-start"
          }`}
        >
          {/* Avatar for Receiver */}
          {!isSender && (
            <Avatar className="h-8 w-8 rounded-full overflow-hidden mr-2 mt-1">
              {message.sender.profilePicture ? (
                <AvatarImage
                  src={`${HOST}/${message.sender.profilePicture}`}
                  alt="profile"
                  className="object-cover w-full h-full bg-black"
                />
              ) : (
                <AvatarFallback
                  className={`uppercase h-8 w-8 flex items-center justify-center text-lg border-[1px] text-white bg-[#4b5563] rounded-full ${getColor(
                    message.sender.color
                  )}`}
                >
                  {message.sender.firstName
                    ? message.sender.firstName.charAt(0)
                    : message.sender.email.charAt(0)}
                </AvatarFallback>
              )}
            </Avatar>
          )}

          {/*  Text Message */}
          {message.messageType === "text" && (
            <div
              className={`${
                isSender
                  ? "bg-purple-700 text-white/90"
                  : "bg-[#344151] text-white/90"
              } pl-2 pr-2 pt-1 pb-1 rounded-md my-1 max-w-[50%] break-words`}
            >
              {message.content}
            </div>
          )}

          {/* File Message */}
          {message.messageType === "file" && (
            <div
              className={`${
                isSender
                  ? "bg-purple-700 bg-opacity-40 text-white/90 border-white/10"
                  : "bg-[#344151]/10 text-white/90 border-white/10"
              } border p-2 rounded-md my-1 max-w-[50%] break-words`}
            >
              {checkIfImage(message.fileURL) ? (
                <div
                  className="cursor-pointer"
                  onClick={() => {
                    setShowImage(true);
                    setImageURL(message.fileURL);
                  }}
                >
                  <img
                    src={`${HOST}/${message.fileURL}`}
                    alt="file"
                    className="w-[200px] h-[200px]"
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-white/80 text-xl bg-black/20 rounded-md p-1">
                    <FcFolder />
                  </span>
                  <span>{message.fileURL.split("/").pop()}</span>
                  <span
                    className="rounded-md p-1 cursor-pointer text-lg hover:bg-black/50 transition-all duration-300"
                    onClick={() => downloadFile(message.fileURL)}
                  >
                    <FaDownload />
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sender Info and Timestamp */}
        <div className="flex flex-col">
          <span
            className={`text-xs text-white/50 ${
              isSender ? "text-right" : "text-left"
            }`}
          >
            {`${message.sender.firstName} ${message.sender.lastName}`}
          </span>
          <span
            className={`text-xs text-white/50 ${
              isSender ? "text-right" : "text-left"
            } mb-2`}
          >
            {moment(message.createdAt).format("LT")}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hidden p-4 px-6 md:w-[65vw] lg:w-[70vw] xl:w-[80vw] w-full">
      {renderMessages()}
      <div ref={scrollRef} />
      {showImage && (
        <div className="fixed z-[1000] top-0 left-0 h-[100vh] w-[100vw] flex items-center justify-center backdrop-blur flex-col">
          <div>
            <img
              src={`${HOST}/${imageURL}`}
              alt="file"
              className="w-[80vw] h-[80vh] object-contain"
            />
          </div>
          <div className="flex gap-5 fixed top-0 mt-5">
            {/* Download Button */}
            <button
              className="bg-black/70 rounded-md p-2 cursor-pointer text-xl hover:bg-purple-600/90 transition-all duration-300 "
              onClick={() => downloadFile(imageURL)}
            >
              <FaDownload />
            </button>
            {/* Close Button */}
            <button
              className="bg-black/70 rounded-md p-1 cursor-pointer text-2xl hover:bg-purple-600/90 transition-all duration-300"
              onClick={() => {
                setShowImage(false);
                setImageURL(null);
              }}
            >
              <IoCloseSharp />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageContainer;
