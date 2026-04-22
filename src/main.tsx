import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { IamVisualizerConfigProvider } from './contexts/IamVisualizerContext';
import { IamServicesProvider } from './contexts/IamServicesContext';

console.log('Main.tsx is running');

window.addEventListener('error', (event) => {
  document.body.innerHTML = `<div style="color:red; background:black; padding:20px; height:100vh;">
    <h1>Global Error</h1>
    <pre>${event.error?.stack || event.message}</pre>
  </div>`;
});

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: 'red', backgroundColor: 'black', height: '100vh' }}>
          <h1>Something went wrong.</h1>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.toString()}</pre>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.stack}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

console.log('Main.tsx: Mounting application');
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <IamVisualizerConfigProvider>
        <IamServicesProvider>
          <App />
        </IamServicesProvider>
      </IamVisualizerConfigProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
