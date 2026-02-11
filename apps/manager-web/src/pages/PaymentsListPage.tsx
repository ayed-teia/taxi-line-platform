import { useEffect, useState } from 'react';
import { subscribeToPayments, PaymentDocument } from '../services/payments.service';
import './PaymentsListPage.css';

/**
 * ============================================================================
 * PAYMENTS LIST PAGE
 * ============================================================================
 * 
 * Read-only view of all payments in the system.
 * Shows: Trip ID, Amount, Status, Method
 * 
 * ============================================================================
 */

/**
 * Get status badge color and text
 */
function getStatusBadge(status: PaymentDocument['status']): { className: string; text: string } {
  switch (status) {
    case 'paid':
      return { className: 'badge-paid', text: 'Paid' };
    case 'pending':
      return { className: 'badge-pending', text: 'Pending' };
    case 'failed':
      return { className: 'badge-failed', text: 'Failed' };
    default:
      return { className: 'badge-pending', text: status };
  }
}

/**
 * Get method display text
 */
function getMethodDisplay(method: PaymentDocument['method']): string {
  switch (method) {
    case 'cash':
      return '💵 Cash';
    case 'card':
      return '💳 Card';
    case 'wallet':
      return '👛 Wallet';
    default:
      return method;
  }
}

/**
 * Format timestamp as readable date
 */
function formatDate(timestamp: any): string {
  if (!timestamp) return 'N/A';
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'N/A';
  }
}

export function PaymentsListPage() {
  const [payments, setPayments] = useState<PaymentDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToPayments((newPayments) => {
      setPayments(newPayments);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="payments-page">
        <h1>💳 Payments</h1>
        <div className="loading">Loading payments...</div>
      </div>
    );
  }

  // Calculate summary stats
  const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0);
  const paidCount = payments.filter(p => p.status === 'paid').length;
  const pendingCount = payments.filter(p => p.status === 'pending').length;

  return (
    <div className="payments-page">
      <h1>💳 Payments</h1>
      
      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card paid">
          <div className="summary-value">₪{totalPaid.toFixed(2)}</div>
          <div className="summary-label">{paidCount} Paid</div>
        </div>
        <div className="summary-card pending">
          <div className="summary-value">₪{totalPending.toFixed(2)}</div>
          <div className="summary-label">{pendingCount} Pending</div>
        </div>
        <div className="summary-card total">
          <div className="summary-value">{payments.length}</div>
          <div className="summary-label">Total Payments</div>
        </div>
      </div>

      {/* Payments Table */}
      {payments.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <p>No payments yet</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="payments-table">
            <thead>
              <tr>
                <th>Trip ID</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => {
                const statusBadge = getStatusBadge(payment.status);
                return (
                  <tr key={payment.paymentId}>
                    <td className="trip-id">
                      {payment.tripId.length > 20 
                        ? `${payment.tripId.slice(0, 8)}...` 
                        : payment.tripId}
                    </td>
                    <td className="amount">
                      <span className="currency">{payment.currency}</span>
                      {payment.amount.toFixed(2)}
                    </td>
                    <td className="method">{getMethodDisplay(payment.method)}</td>
                    <td>
                      <span className={`status-badge ${statusBadge.className}`}>
                        {statusBadge.text}
                      </span>
                    </td>
                    <td className="date">{formatDate(payment.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
