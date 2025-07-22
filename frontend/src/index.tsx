import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';
import { store } from './store/store';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);

// Register service worker for PWA functionality
serviceWorkerRegistration.register({
  onSuccess: () => {
    store.dispatch({
      type: 'ui/setPWAState',
      payload: { isInstalled: true }
    });
  },
  onUpdate: () => {
    store.dispatch({
      type: 'ui/addNotification',
      payload: {
        type: 'info',
        message: 'New version available! Close all tabs to update.'
      }
    });
  }
});