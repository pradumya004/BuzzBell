import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { useAppStore } from "@/store";
import { HOST } from "@/utils/constants";
import { getColor } from "@/lib/utils";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { FiEdit2 } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { IoLogOutOutline } from "react-icons/io5";
import { apiClient } from "@/lib/api-client";
import { LOGOUT_ROUTE } from "@/utils/constants";

const ProfileInfo = () => {
  const { userInfo, setUserInfo } = useAppStore();
  const navigate = useNavigate();
  const logOut = async () => {
    try {
      // Call the logout API here
      const res = await apiClient.post(
        LOGOUT_ROUTE,
        {},
        { withCredentials: true }
      );
      if (res.status === 200) {
        setUserInfo(null);
        navigate("/auth");
      } else {
        console.log("Error Logging Out");
      }
    } catch (err) {
      console.log(err);
    }
  };
  return (
    <div className="absolute bottom-0 h-16 flex items-center justify-between px-5 w-full bg-[#2a2b33]">
      <div className="flex gap-3 items-center justify-center">
        <div className="h-11 w-11 relative">
          <Avatar className="h-full w-full rounded-full overflow-hidden">
            {userInfo.profilePicture ? (
              <AvatarImage
                src={`${HOST}/${userInfo.profilePicture}`}
                alt="profile"
                className="object-cover w-full h-full bg-black"
              />
            ) : (
              <div
                className={`uppercase h-full w-full flex items-center justify-center text-lg border-[1px] text-white bg-[#4b5563] rounded-full ${getColor(
                  userInfo.color
                )}`}
              >
                {userInfo.firstName
                  ? userInfo.firstName.split("").shift()
                  : userInfo.email.split("").shift()}
              </div>
            )}
          </Avatar>
        </div>
        <div>
          {userInfo.firstName && userInfo.lastName
            ? `${userInfo.firstName} ${userInfo.lastName}`
            : ""}
        </div>
      </div>
      <div className="flex gap-4">
        <TooltipProvider>
          {/* Edit Profile */}
          <Tooltip>
            <TooltipTrigger>
              <FiEdit2
                className="text-white text-xl cursor-pointer hover:text-purple-500"
                onClick={() => navigate("/profile")}
              />
            </TooltipTrigger>
            <TooltipContent className="bg-[#9e3ff6] border-none text-white">
              <p>Edit Profile</p>
            </TooltipContent>
          </Tooltip>
          {/* Logout */}
          <Tooltip>
            <TooltipTrigger>
              <IoLogOutOutline
                className="text-white text-2xl cursor-pointer hover:text-red-500"
                onClick={logOut}
              />
            </TooltipTrigger>
            <TooltipContent className="bg-[#ef4444] border-none text-white">
              <p>Logout</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
};

export default ProfileInfo;
