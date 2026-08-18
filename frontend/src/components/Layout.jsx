import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { LiveChatWidget } from './LiveChatWidget'

export const Layout = ({ user, role, onLogout, open, setOpen }) => {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="h-screen w-screen bg-gradient-to-b from-[#568BEB] via-[#4C82E6] to-[#3D74D9] p-2 sm:p-3 lg:p-3.5 flex font-sans overflow-hidden box-border">
      {/* Left Navigation Sidebar (Flex-based expansion & shrinking) */}
      <Sidebar
        user={user}
        role={role}
        onLogout={onLogout}
        open={open}
        setOpen={setOpen}
        isExpanded={isExpanded}
        setIsExpanded={setIsExpanded}
      />

      {/* Main Content Area: Automatically shrinks when sidebar expands, expands when sidebar collapses */}
      <main className="flex-1 min-w-0 flex flex-col bg-[#F8FAFC] rounded-[28px] lg:rounded-[36px] shadow-2xl overflow-y-auto overflow-x-hidden h-full border border-white/30 transition-all duration-300 ease-in-out">
        <Outlet />
      </main>

      {/* Global Bottom Right Floating Live Chat Widget */}
      <LiveChatWidget user={user} role={role} />
    </div>
  )
}
