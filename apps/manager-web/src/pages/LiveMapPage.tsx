import { useEffect, useState } from 'react';
import { subscribeToAllDriverLocations, DriverLiveLocation } from '../services/driver-location.service';
import './LiveMapPage.css';

export function LiveMapPage() {
  const [drivers, setDrivers] = useState<DriverLiveLocation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAllDriverLocations(
      (driverLocations) => {
        setDrivers(driverLocations);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error subscribing to driver locations:', err);
        setError('Failed to load driver locations');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const formatTime = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleTimeString();
  };

  const formatSpeed = (speed: number | null) => {
    if (speed === null || speed <= 0) return 'Stationary';
    return `${Math.round(speed * 3.6)} km/h`;
  };

  if (loading) {
    return (
      <div className="live-map-page">
        <h2>📍 Live Driver Locations</h2>
        <div className="loading">Loading driver locations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="live-map-page">
        <h2>📍 Live Driver Locations</h2>
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="live-map-page">
      <h2>📍 Live Driver Locations</h2>
      
      <div className="stats-bar">
        <div className="stat">
          <span className="stat-value">{drivers.length}</span>
          <span className="stat-label">Online Drivers</span>
        </div>
      </div>

      {drivers.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🚗</span>
          <p>No drivers currently online</p>
        </div>
      ) : (
        <>
          {/* Map placeholder */}
          <div className="map-placeholder">
            <div className="map-content">
              <span className="map-icon">🗺️</span>
              <p>Map integration coming soon</p>
              <p className="map-hint">Driver markers will appear here</p>
            </div>
            {/* Driver markers as dots on placeholder */}
            {drivers.map((driver) => (
              <div 
                key={driver.driverId}
                className="driver-dot"
                style={{
                  // Normalize coordinates to fit in the placeholder area
                  // This is just for visualization - real map would use proper projection
                  left: `${((driver.lng + 180) / 360) * 100}%`,
                  top: `${((90 - driver.lat) / 180) * 100}%`,
                }}
                title={`Driver ${driver.driverId.slice(0, 8)}`}
              >
                🚗
              </div>
            ))}
          </div>

          {/* Driver list */}
          <div className="driver-list">
            <h3>Driver Details</h3>
            <table>
              <thead>
                <tr>
                  <th>Driver ID</th>
                  <th>Location</th>
                  <th>Speed</th>
                  <th>Heading</th>
                  <th>Last Update</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((driver) => (
                  <tr key={driver.driverId}>
                    <td className="driver-id">
                      🚗 {driver.driverId.slice(0, 8)}...
                    </td>
                    <td>
                      {driver.lat.toFixed(5)}, {driver.lng.toFixed(5)}
                    </td>
                    <td>{formatSpeed(driver.speed)}</td>
                    <td>
                      {driver.heading !== null ? `${Math.round(driver.heading)}°` : 'N/A'}
                    </td>
                    <td>{formatTime(driver.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
