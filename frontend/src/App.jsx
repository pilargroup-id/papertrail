import AppRoutes from './routes';
import Toaster from './components/toast/Toaster.jsx';

export default function App() {
  return (
    <>
      <AppRoutes />
      <Toaster />
    </>
  );
}
