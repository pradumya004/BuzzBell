import { useAppStore } from "@/store";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { IoArrowBack } from "react-icons/io5";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { colors, getColor } from "@/lib/utils";
import { FaCamera, FaTrash, FaPlus } from "react-icons/fa";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ADD_PROFILE_IMAGE_ROUTE,
  DELETE_PROFILE_IMAGE_ROUTE,
  HOST,
  UPDATE_PROFILE_ROUTE,
} from "@/utils/constants";
import { apiClient } from "@/lib/api-client";

const Profile = () => {
  const navigate = useNavigate();
  const { userInfo, setUserInfo } = useAppStore();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [image, setImage] = useState(null);
  const [hovered, setHovered] = useState(false);
  const [selectedColor, setSelectedColor] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    console.log({ userInfo });
    if (userInfo.profileSetup) {
      setFirstName(userInfo.firstName);
      setLastName(userInfo.lastName);
      setUsername(userInfo.username);
      setSelectedColor(userInfo.color);
    }
    if (userInfo.profilePicture) {
      setImage(`${HOST}/${userInfo.profilePicture}`);
    }
  }, [userInfo]);

  const validateProfile = () => {
    const usernameRegex = /^[a-zA-Z][a-zA-Z0-9._@$]*$/;
    if (!username) {
      toast.error("Username Is Required");
      return false;
    }
    if (!usernameRegex.test(username)) {
      toast.error(
        "Username must start with a lowercase letter, can only contain lowercase letters, numbers, '.', '_', '@', and '$' and cannot have consecutive special characters."
      );
      return false;
    }
    if (username.length < 3 || username.length > 30) {
      toast.error("Username must be between 3 and 30 characters");
      return false;
    }
    if (!firstName) {
      toast.error("First Name Is Required");
      return false;
    }
    if (!lastName) {
      toast.error("Last Name Is Required");
      return false;
    }
    return true;
  };

  const saveChanges = async () => {
    if (validateProfile()) {
      // Call the update profile API here
      try {
        const res = await apiClient.post(
          UPDATE_PROFILE_ROUTE,
          {
            username,
            firstName,
            lastName,
            color: selectedColor,
          },
          { withCredentials: true }
        );
        if (res.status === 200 && res.data) {
          setUserInfo({ ...res.data });
          toast.success("Profile Updated Successfully");
          navigate("/chat");
        } else {
          toast.error("Failed To Update Profile.");
        }
      } catch (err) {
        toast.error("Failed To Update Profile");
        console.log({ err });
      }
    }
  };

  const handleNavigate = () => {
    if (userInfo.profileSetup) {
      navigate("/chat");
    } else {
      toast.error("Please Complete Your Profile Setup First");
    }
  };

  const handleFileInputClick = () => {
    fileInputRef.current.click();
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    // console.log({ file });
    if (file) {
      const formData = new FormData();
      formData.append("profile-image", file);
      const res = await apiClient.post(ADD_PROFILE_IMAGE_ROUTE, formData, {
        withCredentials: true,
      });
      if (res.status === 200 && res.data.profilePicture) {
        setUserInfo({ ...userInfo, profilePicture: res.data.profilePicture });
        setImage(res.data.profilePicture);
        toast.success("Profile Photo Updated Successfully");
      } else {
        toast.error("Failed To Update Profile Image");
      }
    }
  };

  const handleDeleteImage = async () => {
    try {
      const res = await apiClient.delete(DELETE_PROFILE_IMAGE_ROUTE, {
        withCredentials: true,
      });
      if (res.status === 200) {
        setUserInfo({ ...userInfo, profilePicture: null });
        setImage(null);
        toast.success("Profile Photo Deleted Successfully");
      }
    } catch (error) {
      toast.error("Failed To Delete Profile Image");
    }
  };

  return (
    <div className="bg-[#1b1c24] h-[100vh] flex items-center justify-center flex-col gap-10">
      <div className="flex flex-col gap-10 w-[80vw] md:w-max">
        <div onClick={handleNavigate} className="cursor-pointer">
          <IoArrowBack className="text-4xl lg:text-6xl text-white/90 cursor-pointer" />
        </div>
        <div className="grid grid-cols-2 items-center">
          <div
            className="h-36 w-36 md:h-48 md:w-48 relative flex items-center justify-center left-1/2 transform -translate-x-1/2"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <Avatar className="h-full w-full md:h-48 md:w-48 rounded-full overflow-hidden">
              {image ? (
                <AvatarImage
                  src={image}
                  alt="profile"
                  className="object-cover w-full h-full bg-black"
                />
              ) : (
                <div
                  className={`uppercase h-full w-full md:h-48 md:w-48 flex items-center justify-center text-5xl border-[1px] text-white bg-[#4b5563] rounded-full ${getColor(
                    selectedColor
                  )}`}
                >
                  {firstName
                    ? firstName.split("").shift()
                    : userInfo.email.split("").shift()}
                </div>
              )}
            </Avatar>
            {hovered && (
              <div
                className="absolute bottom-1 right-1 bg-white text-black rounded-full p-2 cursor-pointer opacity-70"
                onClick={image ? handleDeleteImage : handleFileInputClick}
              >
                {image ? (
                  <FaTrash className="text-black text-1xl cursor-pointer" />
                ) : (
                  <FaCamera className="text-black text-2xl cursor-pointer" />
                )}
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={handleImageChange}
              name="profile-image"
              accept=".png, .jpg, .jpeg, .gif, .svg, .webp, .avif"
            />
          </div>
          <div className="flex min-w-32 md:min-w-64 flex-col gap-5 text-white items-center justify-center">
            <div className="w-full text-white">
              <Input
                placeholder="Email"
                type="email"
                disabled
                value={userInfo.email}
                className="rounded-md p-5 bg-[#2c2e3b] border-none"
              />
            </div>
            <div className="w-full text-white">
              <Input
                placeholder="Username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="rounded-md p-5 bg-[#2c2e3b] border-none"
              />
            </div>
            <div className="w-full">
              <Input
                placeholder="First Name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="rounded-md p-5 bg-[#2c2e3b] border-none"
              />
            </div>
            <div className="w-full">
              <Input
                placeholder="Last Name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="rounded-md p-5 bg-[#2c2e3b] border-none"
              />
            </div>
            <div className="w-full flex gap-5">
              {colors.map((color, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedColor(index)}
                  className={`h-8 w-8 rounded-full cursor-pointer ${color} transition-all duration-300 ${
                    selectedColor === index
                      ? "outline outline-2 outline-white/50"
                      : ""
                  }`}
                ></div>
              ))}
            </div>
          </div>
        </div>
        <div className="w-full">
          <Button
            className="w-full p-5 h-12 bg-purple-600 hover:bg-purple-800 transition-all duration-500"
            onClick={saveChanges}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
