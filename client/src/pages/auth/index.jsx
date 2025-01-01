// import Background from "@/assets/login2.png";
import Victory from "@/assets/victory.svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useState } from "react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import { LOGIN_ROUTE, REGISTER_ROUTE } from "@/utils/constants";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store";

const Auth = () => {
  const navigate = useNavigate();
  const { setUserInfo } = useAppStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const validateRegister = () => {
    if (!email.length) {
      toast.error("Email Is Required");
      return false;
    }
    if (!password.length) {
      toast.error("Password Is Required");
      return false;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords Do Not Match");
      return false;
    }
    return true;
  };

  const validateLogin = () => {
    if (!email.length) {
      toast.error("Email Is Required");
      return false;
    }
    if (!password.length) {
      toast.error("Password Is Required");
      return false;
    }
    return true;
  };

  const handleLogin = async () => {
    if (validateLogin()) {
      try {
        const res = await apiClient.post(
          LOGIN_ROUTE,
          {
            email,
            password,
          },
          { withCredentials: true }
        );

        if (res.data.user.id) {
          setUserInfo(res.data.user);
          if (res.data.user.profileSetup) {
            navigate("/chat");
          } else {
            navigate("/profile");
          }
        }
      } catch (error) {
        console.error("Login error details:", error.response?.data);
        toast.error(
          error.response?.data?.message || "Login failed. Please try again."
        );
      }
    }
  };

  const handleRegister = async () => {
    if (validateRegister()) {
      const res = await apiClient.post(
        REGISTER_ROUTE,
        {
          email,
          password,
        },
        { withCredentials: true }
      );
      if (res.status === 201) {
        setUserInfo(res.data.user);
        navigate("/profile");
      }
      // if (res.data.user.id) {
      //   setUserInfo(res.data.user);
      //   navigate("/profile");
      // }
    }
  };

  return (
    <div className="h-[100vh] w-[100vw] flex items-center justify-center bg-gray-200">
      <div className="text-opacity-90 h-[80vh] w-[80vw] bg-white border-white border-2 rounded-2xl shadow-2xl md:w-[90vw] lg:w-[70vw] xl:[60vw] grid xl:grid-cols-2 ">
        <div className="flex flex-col items-center justify-center gap-10">
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center justify-center">
              <h1 className="text-5xl font-bold md:text-6xl">Welcome</h1>
              <img src={Victory} alt="Victory Emoji" className="h-[100px]" />
            </div>
            <p className="font-medium text-center">
              Fill in the details to get started with us!
            </p>
          </div>
          <div className="flex items-center justify-center w-full">
            <Tabs className="w-3/4" defaultValue="login">
              <TabsList className="bg-transparent w-full rounded-none">
                <TabsTrigger
                  value="login"
                  className="data-[state=active]:bg-transparent text-black text-opacity-90 border-b-2 rounded-none w-full data-[state=active]:text-black data-[state=inactive]:text-gray-500 data-[state=active]:font-semibold data-[state=active]:border-b-purple-500 data-[state=inactive]:border-none p-3 transition-all duration-400"
                >
                  Login
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="data-[state=active]:bg-transparent text-black text-opacity-90 border-b-2 rounded-none w-full data-[state=active]:text-black data-[state=inactive]:text-gray-500 data-[state=active]:font-semibold data-[state=active]:border-b-purple-500 data-[state=inactive]:border-none p-3 transition-all duration-400"
                >
                  Register
                </TabsTrigger>
              </TabsList>
              <TabsContent className="flex flex-col gap-4 mt-8" value="login">
                <Input
                  placeholder="Email"
                  type="email"
                  className="rounded-md p-5 border-2 border-gray-300"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  placeholder="Password"
                  type="password"
                  className="rounded-md p-5 border-2 border-gray-300"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Button className="p-5" onClick={handleLogin}>
                  Login
                </Button>
              </TabsContent>
              <TabsContent
                className="flex flex-col gap-4 mt-8"
                value="register"
              >
                <Input
                  placeholder="Email"
                  type="email"
                  className="rounded-md p-5 border-2 border-gray-300"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  placeholder="Password"
                  type="password"
                  className="rounded-md p-5 border-2 border-gray-300"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Input
                  placeholder="Confirm Password"
                  type="password"
                  className="rounded-md p-5 border-2 border-gray-300"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <Button className="p-5" onClick={handleRegister}>
                  Register
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        {/* <div className="hidden xl:flex justify-center items-center">
          <img src={Background} alt="Background Login" className="h-[700px]" />
        </div> */}
      </div>
    </div>
  );
};

export default Auth;
