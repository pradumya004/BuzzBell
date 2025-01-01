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
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store";
import { apiClient } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import MultipleSelector from "@/components/ui/multipleselect";
import {
  CREATE_CHANNEL_ROUTE,
  GET_ALL_CONTACTS_ROUTES,
} from "@/utils/constants.js";
// import { Avatar } from "@/components/ui/avatar";

const CreateChannel = () => {
  const { setSelectedChatData, setSelectedChatType, addChannel } =
    useAppStore();

  const [newChannel, setNewChannel] = useState(false);
  //   const [foundContacts, setFoundContacts] = useState([]);
  const [allContacts, setAllContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [channelName, setChannelName] = useState("");

  useEffect(() => {
    const getData = async () => {
      try {
        const res = await apiClient.get(GET_ALL_CONTACTS_ROUTES, {
          withCredentials: true,
        });
        setAllContacts(res.data.contacts);
        // console.log("All Contacts:", res.data.contacts);
        
      } catch (err) {
        console.error("Failed to fetch contacts:", {
          status: err.response?.status,
          message: err.message,
          endpoint: GET_ALL_CONTACTS_ROUTES,
        });
      }
    };

    getData();
  }, []);

  const createChannel = async () => {
    try {
      if (channelName.length > 0 && selectedContacts.length > 0) {
        // console.log("Selected Contacts:", selectedContacts);
        
        const res = await apiClient.post(
          CREATE_CHANNEL_ROUTE,
          {
            name: channelName,
            members: selectedContacts.map((contact) => contact.value),
          },
          { withCredentials: true }
        );

        if (res.status === 201) {
          setChannelName("");
          setSelectedContacts([]);
          addChannel(res.data.channel);
          setNewChannel(false);
        }
      }
    } catch (err) {
      console.error("Failed to create channel:", {
        status: err.response?.status,
        message: err.message,
        endpoint: "/channels",
      });
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <FaPlus
              className="text-neutral-400 font-light text-opacity-90 text-sm hover:text-neutral-100 cursor-pointer transition-all duration-300"
              onClick={() => setNewChannel(true)}
            />
          </TooltipTrigger>
          <TooltipContent className="bg-[#9e3ff6] border-none text-white mb-2 p-3">
            <p>Create New Channel</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <Dialog open={newChannel} onOpenChange={setNewChannel}>
        <DialogContent className="bg-[#181920] border-none text-white w-[400px] h-[400px] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-center">
              Please Fill Up The Details For New Channel
            </DialogTitle>
            <DialogDescription></DialogDescription>
          </DialogHeader>
          {/* <div className="flex flex-col items-center mt-4">
            <Avatar className="h-16 w-16 bg-[#4b5563] text-white flex items-center justify-center text-2xl rounded-full">
              <span>#</span>
            </Avatar>
          </div> */}
          <div>
            <Input
              placeholder="Channel Name"
              value={channelName}
              className="rounded-md p-5 bg-[#2c2e3b] border-none"
              onChange={(e) => setChannelName(e.target.value)}
            />
          </div>
          <div className="mt-4">
            <MultipleSelector
              className="rounded-md bg-[#2c2e3b] border-none text-white"
              defaultOptions={allContacts}
              placeholder="Search Contacts"
              value={selectedContacts}
              onChange={setSelectedContacts}
              emptyIndicator={
                <p className="text-center text-lg leading-10 text-gray-600 font-bold">
                  No Contacts Found
                </p>
              }
            />
          </div>
          <div>
            <Button
              className="w-full bg-[#46485b] hover:bg-[#8f43e6] transition-all duration-300"
              onClick={createChannel}
            >
              Create Channel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CreateChannel;
