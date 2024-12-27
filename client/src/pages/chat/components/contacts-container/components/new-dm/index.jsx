import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FaPlus } from "react-icons/fa";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { apiClient } from "@/lib/api-client";
import { SEARCH_CONTACTS_ROUTES } from "@/utils/constants.js";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { HOST } from "@/utils/constants";
import { getColor } from "@/lib/utils";

const NewDM = () => {
  const { userInfo, setSelectedChatData, setSelectedChatType } = useAppStore();
  const firstName = userInfo.firstName;

  const [openNewContact, setOpenNewContact] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [foundContacts, setFoundContacts] = useState([]);

  const searchContacts = async (term) => {
    try {
      if (term.length > 0) {
        const res = await apiClient.post(
          SEARCH_CONTACTS_ROUTES,
          { searchTerm: term },
          { withCredentials: true }
        );

        if (res.status === 200 && res.data.contacts) {
          setFoundContacts(res.data.contacts);
        }
      } else {
        setFoundContacts([]);
      }
    } catch (err) {
      console.log({ err });
    }
  };

  const selectNewContact = (contact) => {
    setOpenNewContact(false);
    setSelectedChatType("contact");
    setSelectedChatData(contact);
    searchContacts([]);
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    searchContacts(value);
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <FaPlus
              className="text-neutral-400 font-light text-opacity-90 text-sm hover:text-neutral-100 cursor-pointer transition-all duration-300"
              onClick={() => setOpenNewContact(true)}
            />
          </TooltipTrigger>
          <TooltipContent className="bg-[#9e3ff6] border-none text-white mb-2 p-3">
            <p>Select New Contact</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Dialog open={openNewContact} onOpenChange={setOpenNewContact}>
        <DialogContent className="bg-[#181920] border-none text-white w-[400px] h-[400px] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-center">Please Select A Contact</DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          <div>
            <Input
              placeholder="Search Contacts"
              value={searchTerm}
              className="rounded-md p-5 bg-[#2c2e3b] border-none"
              onChange={handleInputChange}
            />
          </div>
          {searchTerm.length > 0 ? (
            <ScrollArea className="h-[250px]">
              <div className="flex flex-col gap-5">
                {foundContacts.map((contact) => (
                  <div
                    key={contact._id}
                    className="flex items-center gap-3 p-1 bg-[#2c2e3b] rounded-md cursor-pointer"
                    onClick={() => selectNewContact(contact)}
                  >
                    <div className="h-11 w-11 relative">
                      <Avatar className="h-full w-full rounded-full overflow-hidden">
                        {contact.profilePicture ? (
                          <AvatarImage
                            src={`${HOST}/${contact.profilePicture}`}
                            alt="profile"
                            className="object-cover w-full h-full bg-black"
                          />
                        ) : (
                          <div
                            className={`uppercase h-full w-full flex items-center justify-center text-lg border-[1px] text-white bg-[#4b5563] rounded-full ${getColor(
                              contact.color
                            )}`}
                          >
                            {contact.firstName
                              ? contact.firstName.split("").shift()
                              : contact.email.split("").shift()}
                          </div>
                        )}
                      </Avatar>
                    </div>
                    <div className="flex flex-col">
                      <span>
                        {contact.firstName && contact.lastName
                          ? `${contact.firstName} ${contact.lastName}`
                          : ""}
                      </span>
                      <span className="text-xs text-gray-500">
                        {contact.username} &lt;{contact.email}&gt;
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 md:flex mt-5 flex-col justify-center items-center duration-1000 transition-all">
              <DotLottieReact
                src="https://lottie.host/271545f7-271c-4a75-818e-43963e9964be/b6whypeytj.json"
                loop
                autoplay
                style={{ height: 100, width: 100 }}
                className="ml-[-30px]"
                onError={(e) => console.log(e)}
                fallback={<div>Failed to load animation</div>}
              />
              <div className="text-opacity-80 text-white flex flex-col gap-5 items-center mt-5 lg:text-2xl text-xl transition-all duration-500 text-center">
                <h3 className="poppins-medium">
                  Hi <span className="text-purple-500">{firstName}</span>,
                  Search New
                  <span className="text-purple-500"> Contact! </span>
                </h3>
              </div>
            </div>
          )}
          {/* <ScrollArea className="h-[250px]">
            <div className="flex flex-col gap-5">
              {foundContacts.map((contact) => (
                <div
                  key={contact._id}
                  className="flex items-center gap-3 p-3 bg-[#2c2e3b] rounded-md cursor-pointer"
                >
                  <div className="h-11 w-11 relative">
                    <Avatar className="h-full w-full rounded-full overflow-hidden">
                      {contact.profilePicture ? (
                        <AvatarImage
                          src={`${HOST}/${contact.profilePicture}`}
                          alt="profile"
                          className="object-cover w-full h-full bg-black"
                        />
                      ) : (
                        <div
                          className={`uppercase h-full w-full flex items-center justify-center text-lg border-[1px] text-white bg-[#4b5563] rounded-full ${getColor(
                            contact.color
                          )}`}
                        >
                          {contact.firstName
                            ? contact.firstName.split("").shift()
                            : contact.email.split("").shift()}
                        </div>
                      )}
                    </Avatar>
                  </div>
                  <div className="flex flex-col">
                    <span>
                      {contact.firstName && contact.lastName
                        ? `${contact.firstName} ${contact.lastName}`
                        : ""}
                    </span>
                    <span className="text-xs text-gray-500">
                      {contact.email}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          {foundContacts.length <= 0 && (
            <div className="flex-1 md:bg-[#1c1d25] md:flex mt-5 flex-col justify-center items-center duration-1000 transition-all">
              <DotLottieReact
                src="https://lottie.host/3ea25628-3c5b-4faf-ae7d-4ff02be46bf4/V9U3pOXKzE.lottie"
                loop
                autoplay
                height={100}
                width={100}
                className="ml-[-30px]"
              />
              <div className="text-opacity-80 text-white flex flex-col gap-5 items-center mt-5 lg:text-2xl text-xl transition-all duration-500 text-center">
                <h3 className="poppins-medium">
                  Hi <span className="text-purple-500">{firstName}</span>,
                  Search New
                  <span className="text-purple-500"> Contact! </span>
                </h3>
              </div>
            </div>
          )} */}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default NewDM;
