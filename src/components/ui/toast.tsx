"use client";

import * as React from "react"
import { FiX, FiAlertCircle, FiCheckCircle } from "react-icons/fi"
import { cn } from "@/lib/utils"

const toastVariants = {
  default: "bg-white border border-gray-200 text-gray-900",
  destructive: "bg-red-50 border border-red-200 text-red-900",
}

export interface ToastProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: "default" | "destructive"
  title?: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  onClose?: () => void
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant = "default", title, description, action, onClose, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative w-full rounded-lg border p-4 shadow-lg transition-all",
          "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
          "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[swipe=end]:animate-out data-[state=closed]:fade-out-80",
          "data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full",
          toastVariants[variant],
          className
        )}
        {...props}
      >
        <div className="flex items-start gap-3">
          {variant === "destructive" && (
            <FiAlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          )}
          {variant === "default" && title && (
            <FiCheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          )}
          
          <div className="flex-1 min-w-0">
            {title && (
              <div className="text-sm font-semibold mb-1">
                {title}
              </div>
            )}
            {description && (
              <div className="text-sm opacity-90">
                {description}
              </div>
            )}
          </div>
          
          {action && (
            <div className="flex-shrink-0">
              {action}
            </div>
          )}
          
          {onClose && (
            <button
              onClick={onClose}
              className="flex-shrink-0 p-1 rounded-md hover:bg-gray-100 transition-colors"
              aria-label="Close"
              title="Close"
            >
              <FiX className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    )
  }
)
Toast.displayName = "Toast"

export { Toast }
