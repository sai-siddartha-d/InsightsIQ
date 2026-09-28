// src/App.jsx
// Routing uses HashRouter rather than BrowserRouter. GitHub Pages serves
// static files only — it cannot rewrite deep links like /modules/pempal back
// to index.html, so a path-based router 404s on refresh or on a shared link.
// Hash routes (#/modules/pempal) are resolved entirely in the browser and work
// under any repository sub-path without server configuration.
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SidebarProvider } from './context/SidebarContext';
import { BrandProvider } from './context/BrandContext';
import { RegionProvider } from './context/RegionContext';
import AppRoutes from './routes/AppRoutes';


export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <SidebarProvider>
          <BrandProvider>
            <RegionProvider>
              <AppRoutes />
            </RegionProvider>
          </BrandProvider>
        </SidebarProvider>
      </AuthProvider>
    </HashRouter>
  );
}