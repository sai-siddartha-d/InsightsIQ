// src/components/layout/Navbar.jsx
import { useNavigate } from 'react-router-dom';
import Button from '../ui/Button';

export default function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Mock logout — Phase 2+ will hit the auth service
    localStorage.removeItem('mockAuth');
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => navigate('/')}
      >
        <span className="text-2xl font-bold text-primary">InsightsIQ</span>
      </div>
      <Button variant="secondary" onClick={handleLogout}>
        Log Out
      </Button>
    </nav>
  );
}