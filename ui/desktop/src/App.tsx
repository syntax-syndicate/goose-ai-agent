import React, { useEffect, useState } from 'react';
import LauncherWindow from './LauncherWindow';
import ChatWindow from './ChatWindow';
import ErrorScreen from './components/ErrorScreen';
import 'react-toastify/dist/ReactToastify.css'; // import first
import { ToastContainer } from 'react-toastify'; // then this

export default function App() {
  const [fatalError, setFatalError] = useState<string | null>(null);
  const searchParams = new URLSearchParams(window.location.search);
  const isLauncher = searchParams.get('window') === 'launcher';

  useEffect(() => {
    const handleFatalError = (_: any, errorMessage: string) => {
      setFatalError(errorMessage);
    };

    // Listen for fatal errors from main process
    window.electron.on('fatal-error', handleFatalError);

    return () => {
      window.electron.off('fatal-error', handleFatalError);
    };
  }, []);

  if (fatalError) {
    return <ErrorScreen error={fatalError} onReload={() => window.electron.reloadApp()} />;
  }

  return (
      <>
        {isLauncher ? <LauncherWindow /> : <ChatWindow />}
          <ToastContainer
              aria-label={"Test"}
              position="top-right"
              autoClose={3000}
              closeOnClick
              pauseOnHover
          />
      </>
  );
}