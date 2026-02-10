import { useEffect, useState } from 'react';
import { subscribeToDrivers, DriverDocument } from '../services/drivers.service';
import './DriversListPage.css';

/**
 * ============================================================================
 * DRIVERS LIST PAGE
 * ============================================================================
 * 
 * Displays realtime list of all drivers with their locations.
 * No map required - just a simple table view.
 * 
 * ============================================================================
 */

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: any): string {
  if (!timestamp) return 'N/A';
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString();
  } catch {
    return 'N/A';
  }
}

export function DriversListPage() {
  const [drivers, setDrivers] = useState<DriverDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('📡 [DriversListPage] Setting up realtime subscription...');
    
    const unsubscribe = subscribeToDrivers((updatedDrivers) => {
      setDrivers(updatedDrivers);
      setLoading(false);
    });

    return () => {
      console.log('🔌 [DriversListPage] Cleaning up subscription');
      unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="drivers-page">
        <h2>Drivers</h2>
        <p>Loading...</p>
      </div>
    );
  }

  const onlineDrivers = drivers.filter(d => d.status === 'online');
  const offlineDrivers = drivers.filter(d => d.status === 'offline');

  return (
    <div className="drivers-page">
      <h2>Drivers ({drivers.length} total)</h2>
      
      <div className="drivers-summary">
        <span className="online-count">🟢 {onlineDrivers.length} Online</span>
        <span className="offline-count">⚫ {offlineDrivers.length} Offline</span>
      </div>

      {drivers.length === 0 ? (
        <p className="no-drivers">No drivers found. Start the driver app to see updates.</p>
      ) : (
        <table className="drivers-table">
          <thead>
            <tr>
              <th>Driver ID</th>
              <th>Status</th>
              <th>Latitude</th>
              <th>Longitude</th>
              <th>Last Seen</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver) => (
              <tr key={driver.id} className={driver.status === 'online' ? 'online' : 'offline'}>
                <td className="driver-id">{driver.id}</td>
                <td className="status">
                  <span className={`status-badge ${driver.status}`}>
                    {driver.status === 'online' ? '🟢 Online' : '⚫ Offline'}
                  </span>
                </td>
                <td className="coord">{driver.location?.lat?.toFixed(5) || 'N/A'}</td>
                <td className="coord">{driver.location?.lng?.toFixed(5) || 'N/A'}</td>
                <td className="timestamp">{formatTimestamp(driver.lastSeen)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
