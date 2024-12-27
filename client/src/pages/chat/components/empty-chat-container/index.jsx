import { useAppStore } from "@/store";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

const EmptyChatContainer = () => {
  const { userInfo } = useAppStore();
  const firstName = userInfo.firstName;
  return (
    <div className="flex-1 md:bg-[#1c1d25] md:flex flex-col justify-center items-center hidden duration-1000 transition-all">
      <DotLottieReact
        src="https://lottie.host/271545f7-271c-4a75-818e-43963e9964be/b6whypeytj.json"
        loop
        autoplay
        height={200}
        width={200}
        className="ml-[-50px]"
      />
      <div className="text-opacity-80 text-white flex flex-col gap-5 items-center mt-10 lg:text-4xl text-3xl transition-all duration-500 text-center">
        <h3 className="poppins-medium">
          Hi <span className="text-purple-500">{firstName}</span>, Welcome to{" "}
          <span className="text-purple-500">BuzzBell!</span>🚀
        </h3>
      </div>
    </div>
  );
};

export default EmptyChatContainer;
