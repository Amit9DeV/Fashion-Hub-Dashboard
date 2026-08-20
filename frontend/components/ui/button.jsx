import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9963e] disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        default: "bg-[#0b0b0b] text-white hover:bg-[#292929]",
        gold: "bg-[#c9963e] text-[#0b0b0b] hover:bg-[#d8b46a]",
        outline: "border border-[#d6cfc3] bg-white text-[#0b0b0b] hover:border-[#c9963e] hover:bg-[#faf9f6]",
        ghost: "text-[#45413b] hover:bg-[#eee9df] hover:text-[#0b0b0b]",
        danger: "bg-[#9f2f2f] text-white hover:bg-[#862525]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-5 text-base",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
