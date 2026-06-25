'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          backgroundColor: "#0f172a",
          color: "white",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "20px"
        }}>
          <div style={{ fontSize: "50px", marginBottom: "20px" }}>⚠️</div>
          <h2 style={{ fontSize: "24px", fontWeight: "900", marginBottom: "10px" }}>Something went wrong</h2>
          <p style={{ color: "#94a3b8", maxWidth: "400px", marginBottom: "30px" }}>
            The application encountered an unexpected error. This usually happens due to a brief network interruption.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              backgroundColor: "#4f46e5",
              color: "white",
              padding: "12px 24px",
              borderRadius: "8px",
              border: "none",
              fontWeight: "700",
              cursor: "pointer"
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
