import Serial from './serial/Serial';
import Home from './Home';
import SerialProvider from './serial/SerialProvider';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
  },
  {
    path: 'serial',
    element: (
      <SerialProvider>
        <Serial />
      </SerialProvider>
    ),
  },
]);
function App() {
  return <RouterProvider router={router} />;
}

export default App;
