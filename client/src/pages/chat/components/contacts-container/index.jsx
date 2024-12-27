import { useEffect } from "react";
import NewDM from "./components/new-dm";
import ProfileInfo from "./components/profile-info";
import { apiClient } from "@/lib/api-client";
import {
  GET_DM_CONTACTS_ROUTES,
  GET_USER_CHANNELS_ROUTE,
} from "@/utils/constants";
import { useAppStore } from "@/store";
import ContactList from "@/components/contact-list";
import CreateChannel from "./components/create-channel";

const ContactsContainer = () => {
  const {
    setDirectMessagesContacts,
    directMessagesContacts,
    channels,
    setChannels,
  } = useAppStore();

  useEffect(() => {
    const getContacts = async () => {
      try {
        const res = await apiClient.get(GET_DM_CONTACTS_ROUTES, {
          withCredentials: true,
        });
        if (res.data.contacts) {
          setDirectMessagesContacts(res.data.contacts);
        }
      } catch ({ error }) {
        console.log({ error });
      }
    };
    const getChannels = async () => {
      try {
        const res = await apiClient.get(GET_USER_CHANNELS_ROUTE, {
          withCredentials: true,
        });
        if (res.data.channels) {
          setChannels(res.data.channels);
        }
      } catch ({ error }) {
        console.log({ error });
      }
    };

    getContacts();
    getChannels();
  }, [setDirectMessagesContacts, setChannels]);

  return (
    <div className="min-w-32 relative md:w-[35vw] lg:w-[35vw] xl:w-[40vw] bg-[#1b1c24] border-r-4 border-[#2f303b] w-full p-0">
      <div className="pt-3">
        <Logo />
      </div>
      <div className="my-5">
        <div className="flex items-center justify-between pr-10">
          <Title title="Direct Messages" />
          <NewDM />
        </div>
        <div className="max-h-[38vh] overflow-y-auto scrollbar-hidden">
          <ContactList contacts={directMessagesContacts} />
        </div>
      </div>
      <div className="my-5">
        <div className="flex items-center justify-between pr-10">
          <Title title="Channels" />
          <CreateChannel />
        </div>
        <div className="max-h-[38vh] overflow-y-auto scrollbar-hidden">
          <ContactList contacts={channels} isChannel={true} />
        </div>
      </div>
      <ProfileInfo />
    </div>
  );
};

export default ContactsContainer;

const Logo = () => {
  return (
    <div className="flex p-5 justify-start items-center gap-2">
      {/* <img
        src="https://api.logo.com/api/v2/images?design=lg_B1EAqCIszBkErHxJ8V&u=42e6b748c30b1d6fc53b336b3ff0d105d7486379f2bd1f8005987bd3464d7500&width=500&height=400&margins=100&fit=contain&format=webp&quality=60&tightBounds=true"
        alt="Logo"
        className="w-16 h-14 rounded-3xl border-white border-2 border-opacity-70"
      /> */}
      <svg
        id="logo-38"
        width="68"
        height="32"
        viewBox="0 0 78 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {" "}
        <path
          d="M55.5 0H77.5L58.5 32H36.5L55.5 0Z"
          className="ccustom"
          fill="#8338ec"
        ></path>{" "}
        <path
          d="M35.5 0H51.5L32.5 32H16.5L35.5 0Z"
          className="ccompli1"
          fill="#975aed"
        ></path>{" "}
        <path
          d="M19.5 0H31.5L12.5 32H0.5L19.5 0Z"
          className="ccompli2"
          fill="#a16ee8"
        ></path>{" "}
      </svg>
      <span className="text-3xl modak-regular pt-1">W T</span>
    </div>
  );
};

const Title = ({ title }) => {
  return (
    <h6 className="uppercase tracking-widest text-neutral-400 pl-10 text-opacity-90 text-sm">
      {title}
    </h6>
  );
};
