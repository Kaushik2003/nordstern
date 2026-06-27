"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

export const DialogClose = Dialog.Close;

const widths = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
} as const;

export function Modal({
  open,
  onOpenChange,
  children,
  className,
  size = "md",
  align = "center",
  title,
  description,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
  className?: string;
  size?: keyof typeof widths;
  align?: "center" | "top";
  title?: string;
  description?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="fixed inset-0 z-50 bg-black/70 backdrop-blur-[3px]"
              />
            </Dialog.Overlay>
            {/* Centering wrapper (no transform) so framer can own the card transform. */}
            <Dialog.Content asChild forceMount>
              <div
                className={cn(
                  "fixed inset-0 z-50 grid justify-items-center overflow-y-auto p-4",
                  align === "center" ? "items-center" : "items-start pt-[12vh]",
                )}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: 6 }}
                  transition={{ type: "spring", stiffness: 320, damping: 28 }}
                  className={cn(
                    "relative w-full rounded-[16px] border border-border-default bg-surface-3 shadow-lg",
                    widths[size],
                    className,
                  )}
                >
                  {title && (
                    <VisuallyHidden>
                      <Dialog.Title>{title}</Dialog.Title>
                    </VisuallyHidden>
                  )}
                  {description && (
                    <VisuallyHidden>
                      <Dialog.Description>{description}</Dialog.Description>
                    </VisuallyHidden>
                  )}
                  {children}
                </motion.div>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

export function Sheet({
  open,
  onOpenChange,
  children,
  width = 540,
  title = "Detail",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  children: React.ReactNode;
  width?: number;
  title?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount>
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 380, damping: 40 }}
                style={{ width }}
                className="fixed right-0 top-0 z-50 flex h-dvh max-w-[94vw] flex-col border-l border-border-default bg-surface-1 shadow-lg"
              >
                <VisuallyHidden>
                  <Dialog.Title>{title}</Dialog.Title>
                </VisuallyHidden>
                {children}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

export function SheetHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border-subtle px-5 py-4">
      <div className="min-w-0">
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <div className="text-[15px] font-semibold tracking-tight text-text-primary">{title}</div>
        {children}
      </div>
      <Dialog.Close className="grid size-8 shrink-0 place-items-center rounded-[9px] text-text-tertiary transition-colors hover:bg-surface-2 hover:text-text-primary">
        <X className="size-4" />
      </Dialog.Close>
    </div>
  );
}

export function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto px-5 py-4", className)} {...props} />;
}
