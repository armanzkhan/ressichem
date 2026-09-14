"use client";

import { useClickOutside } from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";
import { SetStateActionType } from "@/types/set-state-action-type";
import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

type DropdownContextType = {
  isOpen: boolean;
  handleOpen: () => void;
  handleClose: () => void;
  triggerButtonRef?: React.RefObject<HTMLElement | null>;
};

const DropdownContext = createContext<DropdownContextType | null>(null);

function useDropdownContext() {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error("useDropdownContext must be used within a Dropdown");
  }
  return context;
}

type DropdownProps = {
  children: React.ReactNode;
  isOpen: boolean;
  setIsOpen: SetStateActionType<boolean>;
};

export function Dropdown({ children, isOpen, setIsOpen }: DropdownProps) {
  const triggerRef = useRef<HTMLElement>(null);
  const triggerButtonRef = useRef<HTMLElement>(null);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      handleClose();
    }
  };

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement;
      // Don't disable pointer events on mobile to allow proper touch interaction
      if (window.innerWidth >= 768) {
        document.body.style.pointerEvents = "none";
      }
    } else {
      document.body.style.removeProperty("pointer-events");

      setTimeout(() => {
        triggerRef.current?.focus();
      }, 0);
    }
  }, [isOpen]);

  function handleClose() {
    setIsOpen(false);
  }

  function handleOpen() {
    setIsOpen(true);
  }

  return (
    <DropdownContext.Provider value={{ isOpen, handleOpen, handleClose, triggerButtonRef }}>
      <div className="relative" onKeyDown={handleKeyDown} data-dropdown-context>
        {children}
      </div>
    </DropdownContext.Provider>
  );
}

type DropdownContentProps = {
  align?: "start" | "end" | "center";
  className?: string;
  children: React.ReactNode;
};

export function DropdownContent({
  children,
  align = "center",
  className,
}: DropdownContentProps) {
  const { isOpen, handleClose, triggerButtonRef } = useDropdownContext();
  const [isMobile, setIsMobile] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, right: 0 });

  const contentRef = useClickOutside<HTMLDivElement>(() => {
    if (isOpen) handleClose();
  });

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate position for desktop
  useEffect(() => {
    if (!isOpen || isMobile) return;

    // Use a small delay to ensure the trigger button ref is set
    const timeoutId = setTimeout(() => {
      // Try to get trigger from ref first (most reliable)
      let triggerElement: HTMLElement | null = null;
      
      if (triggerButtonRef?.current) {
        triggerElement = triggerButtonRef.current;
      } else {
        // Fallback: find the trigger within the same dropdown context
        // Look for the closest parent with relative positioning, then find trigger within it
        const dropdownContext = document.querySelector('[data-dropdown-context]');
        if (dropdownContext) {
          const trigger = dropdownContext.querySelector('[data-dropdown-trigger][data-state="open"]') as HTMLElement;
          if (trigger) triggerElement = trigger;
        }
        
        // Last resort: find any open trigger
        if (!triggerElement) {
          const allTriggers = document.querySelectorAll('[data-dropdown-trigger][data-state="open"]');
          // Get the last one (most recently opened)
          triggerElement = allTriggers[allTriggers.length - 1] as HTMLElement;
        }
      }

      if (!triggerElement) {
        console.warn('Dropdown: Could not find trigger element');
        return;
      }

      const rect = triggerElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Get actual dropdown width if available, otherwise use estimate
      // Note: contentRef might not be set yet on first render, so we estimate
      const dropdownWidth = 400; // Will be recalculated after render if needed
      const dropdownHeight = 300; // Will be recalculated after render if needed

      let left = 0;
      let top = rect.bottom + 8;

      if (align === "end") {
        // Align to the right edge of the trigger
        left = rect.right - dropdownWidth;
        // If it would go off-screen to the left, align to left edge of trigger
        if (left < 16) {
          left = rect.left;
        }
        // If it would go off-screen to the right, align to right edge of viewport
        if (left + dropdownWidth > viewportWidth - 16) {
          left = viewportWidth - dropdownWidth - 16;
        }
      } else if (align === "start") {
        // Align to the left edge of the trigger
        left = rect.left;
        // If it would go off-screen, align to left edge of viewport
        if (left + dropdownWidth > viewportWidth - 16) {
          left = viewportWidth - dropdownWidth - 16;
        }
        if (left < 16) {
          left = 16;
        }
      } else {
        // Center
        left = rect.left + (rect.width / 2) - (dropdownWidth / 2);
        if (left + dropdownWidth > viewportWidth - 16) {
          left = viewportWidth - dropdownWidth - 16;
        }
        if (left < 16) {
          left = 16;
        }
      }

      // Ensure dropdown doesn't go below viewport
      if (top + dropdownHeight > viewportHeight - 16) {
        top = rect.top - dropdownHeight - 8;
        // If it would go above viewport, position below trigger
        if (top < 16) {
          top = rect.bottom + 8;
        }
      }

      setPosition({
        top,
        left,
        right: 0
      });
    }, 10);

    return () => clearTimeout(timeoutId);
  }, [isOpen, isMobile, align, triggerButtonRef]);

  if (!isOpen) return null;

  const dropdownContent = (
    <div
      ref={contentRef}
      role="menu"
      aria-orientation="vertical"
      className={cn(
        "fade-in-0 zoom-in-95 pointer-events-auto fixed z-[99999] min-w-[8rem] rounded-lg",
        className,
      )}
      style={{
        // Mobile-specific positioning
        ...(isMobile && {
          top: '60px',
          right: '10px',
          left: '10px',
          maxWidth: 'calc(100vw - 20px)',
          width: 'calc(100vw - 20px)',
        }),
        // Desktop positioning
        ...(!isMobile && {
          top: `${position.top}px`,
          left: `${position.left}px`,
          maxWidth: 'min(400px, calc(100vw - 2rem))',
          width: 'auto',
        }),
      }}
    >
      {children}
    </div>
  );

  // Use portal to render at document root to avoid clipping
  return createPortal(dropdownContent, document.body);
}

type DropdownTriggerProps = React.HTMLAttributes<HTMLButtonElement> & {
  children: React.ReactNode;
};

export function DropdownTrigger({ children, className }: DropdownTriggerProps) {
  const { handleOpen, handleClose, isOpen, triggerButtonRef } = useDropdownContext();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Update the shared ref when this component mounts/updates
  useEffect(() => {
    if (triggerButtonRef && buttonRef.current) {
      (triggerButtonRef as React.MutableRefObject<HTMLElement | null>).current = buttonRef.current;
    }
  }, []);

  const handleToggle = () => {
    if (isOpen) {
      handleClose();
    } else {
      handleOpen();
    }
  };

  return (
    <button
      ref={buttonRef}
      className={className}
      onClick={handleToggle}
      aria-expanded={isOpen}
      aria-haspopup="menu"
      data-state={isOpen ? "open" : "closed"}
      data-dropdown-trigger
    >
      {children}
    </button>
  );
}

export function DropdownClose({ children }: PropsWithChildren) {
  const { handleClose } = useDropdownContext();

  return <div onClick={handleClose}>{children}</div>;
}
