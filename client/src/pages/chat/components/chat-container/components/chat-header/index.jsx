import { RiCloseFill } from "react-icons/ri";
import { useAppStore } from "@/store";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { HOST } from "@/utils/constants";
import { getColor } from "@/lib/utils";

const ChatHeader = () => {
  const { closeChat, selectedChatData, selectedChatType } = useAppStore();
  return (
    <div className="h-[10vh] border-b-2 border-[#2f303b] flex items-center justify-between px-20">
      <div className="flex gap-5 items-center">
        <div className="h-11 w-11 relative">
          {selectedChatType === "contact" ? (
            <Avatar className="h-full w-full rounded-full overflow-hidden">
              {selectedChatData.profilePicture ? (
                <AvatarImage
                  src={`${HOST}/${selectedChatData.profilePicture}`}
                  alt="profile"
                  className="object-cover w-full h-full bg-black"
                />
              ) : (
                <div
                  className={`uppercase h-full w-full flex items-center justify-center text-lg border-[1px] text-white bg-[#4b5563] rounded-full ${getColor(
                    selectedChatData.color
                  )}`}
                >
                  {selectedChatData.firstName
                    ? selectedChatData.firstName.split("").shift()
                    : selectedChatData.email.split("").shift()}
                </div>
              )}
            </Avatar>
          ) : (
            <div className="bg-[#ffffff22] h-10 w-10 rounded-full flex items-center justify-center">
              #
            </div>
          )}
        </div>
        <div className="flex flex-col">
          <div>
            {selectedChatType === "channel" && selectedChatData.name}
            {selectedChatType === "contact" &&
              `${selectedChatData.firstName + " " + selectedChatData.lastName}`}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            {selectedChatType === "contact" && selectedChatData.username}
          </div>
        </div>
      </div>
      <button
        className="text-neutral-500 focus-border-none focus:outline-none focus:text-white duration-500 transition-all hover:text-white"
        onClick={closeChat}
      >
        <RiCloseFill className="text-3xl" />
      </button>
    </div>
  );
};

export default ChatHeader;
