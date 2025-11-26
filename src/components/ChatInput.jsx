import { useState, useRef, useEffect } from 'react';
import { Send, Plus, ChevronDown, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

export default function ChatInput({ onSendMessage, disabled }) {
    const [message, setMessage] = useState('');
    const textareaRef = useRef(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    }, [message]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (message.trim() && !disabled) {
            onSendMessage(message);
            setMessage('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="relative">
                <div className="relative bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="How can I help you today?"
                        disabled={disabled}
                        rows={1}
                        className="w-full bg-transparent px-6 py-4 pr-28 text-foreground placeholder-muted-foreground resize-none focus:outline-none max-h-48 overflow-y-auto"
                    />

                    {/* Bottom toolbar */}
                    <div className="flex items-center justify-between px-4 pb-3">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                            >
                                <Plus className="w-4 h-4 text-muted-foreground" />
                            </button>
                            <button
                                type="button"
                                className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
                            >
                                <Clock className="w-4 h-4 text-muted-foreground" />
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Model Selector */}
                            <button
                                type="button"
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
                            >
                                <span className="text-xs text-foreground">Sonnet 4.5</span>
                                <ChevronDown className="w-3 h-3 text-muted-foreground" />
                            </button>

                            {/* Send Button */}
                            <button
                                type="submit"
                                disabled={!message.trim() || disabled}
                                className={cn(
                                    'p-2 rounded-lg transition-all',
                                    message.trim() && !disabled
                                        ? 'bg-primary text-primary-foreground hover:opacity-90'
                                        : 'bg-secondary text-muted-foreground cursor-not-allowed'
                                )}
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </form>

            {/* Info text */}
            <p className="text-xs text-muted-foreground text-center mt-2">
                Free plan · <button className="underline hover:text-foreground transition-colors">Upgrade</button>
            </p>
        </div>
    );
}
