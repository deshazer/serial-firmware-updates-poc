import Home from './Home';
import FirmwareUpdater from './firmware/FirmwareUpdater';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: 'firmware',
    element: <FirmwareUpdater />,
   
  },
]);
function App() {
  return <RouterProvider router={router} />;
}

export default App;
