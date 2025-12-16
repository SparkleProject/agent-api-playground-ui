import React from 'react';

export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <div className="p-4 border border-red-500 rounded bg-red-50 text-red-500 text-sm">
                    Something went wrong rendering this content.
                    <br />
                    <span className="text-xs opacity-75">{this.state.error?.message}</span>
                </div>
            );
        }

        return this.props.children;
    }
}
