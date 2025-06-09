import { VariantProps } from "class-variance-authority"
import { TooltipContentProps } from "@/components/ui/tooltip"

export const SIDEBAR_COOKIE_NAME = "sidebar:state"
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
export const SIDEBAR_WIDTH = "16rem"
export const SIDEBAR_WIDTH_MOBILE = "18rem"
export const SIDEBAR_WIDTH_ICON = "3rem"
export const SIDEBAR_KEYBOARD_SHORTCUT = "b"

export type SidebarState = "expanded" | "collapsed"

export type SidebarContext = {
  state: SidebarState
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
}

export type SidebarProviderProps = React.ComponentProps<"div"> & {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export type SidebarProps = React.ComponentProps<"div"> & {
  side?: "left" | "right"
  variant?: "sidebar" | "floating" | "inset"
  collapsible?: "offcanvas" | "icon" | "none"
}

export type SidebarMenuButtonProps = React.ComponentProps<"button"> & {
  asChild?: boolean
  isActive?: boolean
  tooltip?: string | TooltipContentProps
  variant?: "default" | "outline"
  size?: "default" | "sm" | "lg"
}

export type SidebarMenuActionProps = React.ComponentProps<"button"> & {
  asChild?: boolean
  showOnHover?: boolean
}

export type SidebarMenuSubButtonProps = React.ComponentProps<"a"> & {
  asChild?: boolean
  size?: "sm" | "md"
  isActive?: boolean
}

export type SidebarMenuSkeletonProps = React.ComponentProps<"div"> & {
  showIcon?: boolean
}

export type AsChildProp = {
  asChild?: boolean
}