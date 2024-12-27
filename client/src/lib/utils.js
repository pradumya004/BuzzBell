import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"
import animationData from "@/assets/lottie-json";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
};

export const colors = [
  "bg-[#ff006e57] text-[#ff006e] border-[1px] border-[#ff006eaa]",
  "bg-[#06d6a057] text-[#06d6a0] border-[1px] border-[#06d6a0bb]",
  "bg-[#4cc9f057] text-[#4cc9f0] border-[1px] border-[#4cc9f0bb]",
  "bg-[#8338ec57] text-[#8338ec] border-[1px] border-[#8338ecbb]",
  "bg-[#ff7b0057] text-[#ff7b00] border-[1px] border-[#ff7b00bb]",

];

export const getColor = (color) => {
  if (color >= 0 && color < colors.length) {
    return colors[color];
  }
  return colors[0];
};

export const animationDefaultOptions = {
  loop: true,
  autoplay: true,
  animationData
};
