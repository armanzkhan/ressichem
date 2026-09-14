import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import Link from "next/link";
import { useSidebarContext } from "./sidebar-context";

const menuItemBaseStyles = cva(
  "rounded-xl px-3 py-2.5 font-medium text-blue-900 transition-all duration-300 ease-in-out dark:text-white group relative text-sm",
  {
    variants: {
      isActive: {
        true: "bg-gradient-to-r from-blue-900/10 to-blue-900/5 text-blue-900 shadow-md border-l-4 border-blue-900 hover:from-blue-900/15 hover:to-blue-900/10 dark:bg-gradient-to-r dark:from-blue-900/20 dark:to-blue-900/10 dark:text-white dark:border-blue-400",
        false:
          "hover:bg-gradient-to-r hover:from-gray-100 hover:to-gray-50 hover:text-blue-900 hover:shadow-sm hover:border-l-4 hover:border-blue-300 hover:dark:from-blue-900/20 hover:dark:to-blue-900/10 hover:dark:text-white hover:dark:border-blue-400",
      },
    },
    defaultVariants: {
      isActive: false,
    },
  },
);

export function MenuItem(
  props: {
    className?: string;
    children: React.ReactNode;
    isActive: boolean;
  } & ({ as?: "button"; onClick: () => void } | { as: "link"; href: string }),
) {
  const { toggleSidebar, isMobile } = useSidebarContext();

  if (props.as === "link") {
    return (
      <Link
        href={props.href}
        // Close sidebar on clicking link if it's mobile
        onClick={() => isMobile && toggleSidebar()}
        className={cn(
          menuItemBaseStyles({
            isActive: props.isActive,
            className: "relative block py-2",
          }),
          props.className,
        )}
      >
        {props.children}
      </Link>
    );
  }

  return (
    <button
      onClick={props.onClick}
      aria-expanded={props.isActive}
      className={menuItemBaseStyles({
        isActive: props.isActive,
        className: "flex w-full items-center gap-3 py-3",
      })}
    >
      {props.children}
    </button>
  );
}
