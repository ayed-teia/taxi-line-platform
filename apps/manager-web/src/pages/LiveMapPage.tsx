import { useEffect, useState, useMemo, useRef } from 'react';
import { subscribeToAllDriverLocations, DriverLiveLocation, getUniqueLineIds } from '../services/driver-location.service';
import { subscribeToActiveTrips, subscribeToPendingTrips, TripData, getTripStatusDisplay } from '../services/trips.service';
import { DriverMap } from '../components/DriverMap';
import '../components/DriverMap.css';
import './LiveMapPage.css';

export function LiveMapPage() {
  const [drivers, setDrivers] = useState<DriverLiveLocation[]>([]);
  const [activeTrips, setActiveTrips] = useState<TripData[]>([]);
  const [pendingTrips, setPendingTrips] = useState<TripData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Filter state
  const [showOnlineOnly, setShowOnlineOnly] = useState(true);
  const [selectedLineId, setSelectedLineId] = useState<string>('all');

  // Track if component is mounted to prevent memory leaks
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    // Subscribe to driver locations
    const unsubDrivers = subscribeToAllDriverLocations(
      (driverLocations) => {
        if (isMounted.current) {
          setDrivers(driverLocations);
          setLoading(false);
          setError(null);
        }
      },
      (err) => {
        if (isMounted.current) {
          console.error('Error subscribing to driver locations:', err);
          setError('Failed to load driver locations. Please check your connection.');
          setLoading(false);
        }
      }
    );

    // Subscribe to active trips
    const unsubActiveTrips = subscribeToActiveTrips(
      (trips) => {
        if (isMounted.current) {
          setActiveTrips(trips);
        }
      },
      (err) => {
        console.error('Error subscribing to active trips:', err);
      }
    );

    // Subscribe to pending trips
    const unsubPendingTrips = subscribeToPendingTrips(
      (trips) => {
        if (isMounted.current) {
          setPendingTrips(trips);
        }
      },
      (err) => {
        console.error('Error subscribing to pending trips:', err);
      }
    );

    // Cleanup: unsubscribe and mark as unmounted
    return () => {
      isMounted.current = false;
      unsubDrivers();
      unsubActiveTrips();
      unsubPendingTrips();
    };
  }, []);

  // Get unique line IDs for filter dropdown
  const lineIds = useMemo(() => getUniqueLineIds(drivers), [drivers]);

  // Count drivers by availability
  const driverStats = useMemo(() => {
    const online = drivers.filter(d => d.isOnline).length;
    const available = drivers.filter(d => d.isOnline && d.isAvailable).length;
    const busy = drivers.filter(d => d.isOnline && !d.isAvailable).length;
    return { online, available, busy };
  }, [drivers]);

  // Apply filters
  const filteredDrivers = useMemo(() => {
    return drivers.filter(driver => {
      // Online filter (all drivers in driverLive are online, but keeping for future)
      if (showOnlineOnly && !driver.isOnline) return false;
      
      // Line ID filter
      if (selectedLineId !== 'all' && driver.lineId !== selectedLineId) return false;
      
      return true;
    });
  }, [drivers, showOnlineOnly, selectedLineId]);

  const formatTime = (date: Date | null) => {
    if (!date) return 'N/A';
    return date.toLocaleTimeString();
  };

  const formatRelativeTime = (date: Date | null) => {
    if (!date) return 'N/A';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return formatTime(date);
  };

  const formatSpeed = (speed: number | null) => {
    if (speed === null || speed <= 0) return 'Stationary';
    return `${Math.round(speed * 3.6)} km/h`;
  };

  const getDriverDisplayName = (driver: DriverLiveLocation) => {
    if (driver.name) return driver.name;
    return `Driver ${driver.driverId.slice(0, 8)}`;
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
      <h2>📍 Live Dashboard</h2>
      
      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stat">
          <span className="stat-value">{driverStats.online}</span>
          <span className="stat-label">🟢 Online</span>
        </div>
        <div className="stat available">
          <span className="stat-value">{driverStats.available}</span>
          <span className="stat-label">✅ Available</span>
        </div>
        <div className="stat busy">
          <span className="stat-value">{driverStats.busy}</span>
          <span className="stat-label">🚗 Busy</span>
        </div>
        <div className="stat trips">
          <span className="stat-value">{activeTrips.length}</span>
          <span className="stat-label">🛣️ Active Trips</span>
        </div>
        {pendingTrips.length > 0 && (
          <div className="stat pending">
            <span className="stat-value">{pendingTrips.length}</span>
            <span className="stat-label">⏳ Pending</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="filter-group">
          <label className="filter-checkbox">
            <input
              type="checkbox"
              checked={showOnlineOnly}
              onChange={(e) => setShowOnlineOnly(e.target.checked)}
            />
            <span>Online Only</span>
          </label>
        </div>

        {lineIds.length > 0 && (
          <div className="filter-group">
            <label>
              <span className="filter-label">Line:</span>
              <select
                value={selectedLineId}
                onChange={(e) => setSelectedLineId(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Lines</option>
                {lineIds.map(lineId => (
                  <option key={lineId} value={lineId}>{lineId}</option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>

      {filteredDrivers.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">🚗</span>
          <p>No drivers match current filters</p>
          {drivers.length > 0 && (
            <button 
              className="reset-filters-btn"
              onClick={() => {
                setShowOnlineOnly(true);
                setSelectedLineId('all');
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Live Map with Driver Markers and Trips */}
          <div className="map-container">
            <DriverMap drivers={filteredDrivers} trips={[...activeTrips, ...pendingTrips]} />
          </div>

          {/* Driver list */}
          <div className="driver-list">
            <h3>Driver Details ({filteredDrivers.length})</h3>
            <table>
              <thead>
                <tr>
                  <th>Driver</th>
                  <th>Line</th>
                  <th>Status</th>
                  <th>Availability</th>
                  <th>Location</th>
                  <th>Speed</th>
                  <th>Last Update</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrivers.map((driver) => (
                  <tr key={driver.driverId}>
                    <td className="driver-name">
                      <span className="driver-avatar">🚗</span>
                      <div className="driver-info">
                        <span className="name">{getDriverDisplayName(driver)}</span>
                        <span className="driver-id-small">{driver.driverId.slice(0, 8)}</span>
                      </div>
                    </td>
                    <td>
                      {driver.lineId ? (
                        <span className="line-badge">{driver.lineId}</span>
                      ) : (
                        <span className="no-line">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-badge ${driver.isOnline ? 'online' : 'offline'}`}>
                        {driver.isOnline ? '● Online' : '○ Offline'}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${driver.isAvailable ? 'available' : 'busy'}`}>
                        {driver.isAvailable ? '✅ Available' : '🚗 Busy'}
                      </span>
                    </td>
                    <td className="coordinates">
                      {driver.lat.toFixed(5)}, {driver.lng.toFixed(5)}
                    </td>
                    <td>{formatSpeed(driver.speed)}</td>
                    <td className="last-update">
                      <span className="relative-time">{formatRelativeTime(driver.updatedAt)}</span>
                      <span className="absolute-time">{formatTime(driver.updatedAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Active Trips */}
          {activeTrips.length > 0 && (
            <div className="trips-list">
              <h3>🛣️ Active Trips ({activeTrips.length})</h3>
              <table>
                <thead>
                  <tr>
                    <th>Trip ID</th>
                    <th>Status</th>
                    <th>Driver</th>
                    <th>Price</th>
                    <th>Distance</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTrips.map((trip) => {
                    const statusDisplay = getTripStatusDisplay(trip.status);
                    return (
                      <tr key={trip.tripId}>
                        <td className="trip-id">{trip.tripId.slice(0, 8)}...</td>
                        <td>
                          <span className="trip-status" style={{ color: statusDisplay.color }}>
                            {statusDisplay.emoji} {statusDisplay.label}
                          </span>
                        </td>
                        <td>{trip.driverId?.slice(0, 8) ?? '—'}</td>
                        <td>₪{trip.estimatedPriceIls}</td>
                        <td>{trip.estimatedDistanceKm.toFixed(1)} km</td>
                        <td>{formatRelativeTime(trip.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pending/Unmatched Trips */}
          {pendingTrips.length > 0 && (
            <div className="trips-list pending-trips">
              <h3>⏳ Pending Requests ({pendingTrips.length})</h3>
              <table>
                <thead>
                  <tr>
                    <th>Trip ID</th>
                    <th>Status</th>
                    <th>Assigned Driver</th>
                    <th>Price</th>
                    <th>Waiting Since</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTrips.map((trip) => {
                    const statusDisplay = getTripStatusDisplay(trip.status);
                    return (
                      <tr key={trip.tripId}>
                        <td className="trip-id">{trip.tripId.slice(0, 8)}...</td>
                        <td>
                          <span className="trip-status" style={{ color: statusDisplay.color }}>
                            {statusDisplay.emoji} {statusDisplay.label}
                          </span>
                        </td>
                        <td>{trip.driverId?.slice(0, 8) ?? '—'}</td>
                        <td>₪{trip.estimatedPriceIls}</td>
                        <td>{formatRelativeTime(trip.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
