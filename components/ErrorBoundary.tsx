/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full min-h-[200px] flex flex-col items-center justify-center p-6 text-center bg-zinc-900/50 border border-zinc-800 rounded-lg backdrop-blur-sm">
            <div className="p-3 bg-red-500/10 rounded-full mb-3">
                <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-zinc-200 font-medium mb-1">Component Error</h3>
            <p className="text-zinc-500 text-sm mb-4 max-w-md">
                {this.state.error?.message || "An unexpected error occurred in this interface element."}
            </p>
            <button 
                onClick={() => this.setState({ hasError: false })}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs uppercase tracking-wider font-medium transition-colors border border-zinc-700"
            >
                Try Again
            </button>
        </div>
      );
    }

    return this.props.children;
  }
}