import { useDevice } from '../hooks/useDevice';
import MobileLayout from './MobileLayout';
import DesktopLayout from './DesktopLayout';

export default function Layout() {
  const { isMobile } = useDevice();
  return isMobile ? <MobileLayout /> : <DesktopLayout />;
}
