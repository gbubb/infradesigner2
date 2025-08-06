import * as React from "react"
import { type SidebarContext as SidebarContextType } from "./SidebarTypes"

export const SidebarContext = React.createContext<SidebarContextType | null>(null)