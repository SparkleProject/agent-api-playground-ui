import { Menu, Plus, MessageSquare, FileCode, Settings, User } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Sidebar({ isOpen, toggleSidebar }) {
    return (
        <>
            {/* Sidebar */}
            <div
                className={cn(
                    'fixed left-0 top-0 h-full bg-[rgb(13,13,13)] border-r border-[rgb(var(--border))] transition-all duration-300 z-10',
                    isOpen ? 'w-64' : 'w-16'
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Top Section */}
                    <div className="p-4 space-y-2">
                        <button
                            onClick={toggleSidebar}
                            className="w-full flex items-center justify-start p-2 rounded-lg hover:bg-secondary transition-colors"
                        >
                            <Menu className="w-5 h-5 text-muted-foreground" />
                        </button>
                        <button className="w-full flex items-center justify-start p-2 rounded-lg hover:bg-secondary transition-colors text-primary">
                            <Plus className="w-5 h-5" />
                            {isOpen && <span className="ml-3 text-sm">New Chat</span>}
                        </button>
                    </div>

                    {/* Navigation Icons */}
                    <div className="flex-1 p-4 space-y-2">
                        <button className="w-full flex items-center justify-start p-2 rounded-lg hover:bg-secondary transition-colors">
                            <MessageSquare className="w-5 h-5 text-muted-foreground" />
                            {isOpen && <span className="ml-3 text-sm text-muted-foreground">Recents</span>}
                        </button>
                        <button className="w-full flex items-center justify-start p-2 rounded-lg hover:bg-secondary transition-colors">
                            <FileCode className="w-5 h-5 text-muted-foreground" />
                            {isOpen && <span className="ml-3 text-sm text-muted-foreground">Projects</span>}
                        </button>
                    </div>

                    {/* Bottom Section */}
                    <div className="p-4 space-y-2 border-t border-border">
                        <button className="w-full flex items-center justify-start p-2 rounded-lg hover:bg-secondary transition-colors">
                            <Settings className="w-5 h-5 text-muted-foreground" />
                            {isOpen && <span className="ml-3 text-sm text-muted-foreground">Settings</span>}
                        </button>
                        <button className="w-full flex items-center justify-start p-2 rounded-lg hover:bg-secondary transition-colors">
                            <User className="w-5 h-5 text-muted-foreground" />
                            {isOpen && <span className="ml-3 text-sm text-muted-foreground">Profile</span>}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
