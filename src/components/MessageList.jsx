import { Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';

export default function MessageList({ messages, isLoading }) {
    return (
        <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto space-y-8 py-8">
                {messages.map((msg, index) => (
                    <div key={index} className="flex gap-4 group">
                        {/* Avatar */}
                        <div
                            className={cn(
                                'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                                msg.role === 'user'
                                    ? 'bg-secondary'
                                    : 'bg-gradient-to-br from-blue-500 to-blue-600'
                            )}
                        >
                            {msg.role === 'user' ? (
                                <User className="w-4 h-4 text-foreground" />
                            ) : (
                                <Bot className="w-4 h-4 text-white" />
                            )}
                        </div>

                        {/* Message Content */}
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-foreground mb-1">
                                {msg.role === 'user' ? 'You' : 'AI Assistant'}
                            </div>
                            <div className="text-foreground/90 whitespace-pre-wrap break-words prose prose-invert max-w-none">
                                {msg.role === 'user' ? (
                                    msg.content
                                ) : (
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {msg.content}
                                    </ReactMarkdown>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Loading Indicator */}
                {isLoading && (
                    <div className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600">
                            <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1">
                            <div className="text-sm font-semibold text-foreground mb-1">
                                AI Assistant
                            </div>
                            <div className="flex gap-1">
                                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
