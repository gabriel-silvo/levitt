// src/components/DashboardCard.jsx
import React from 'react';

function DashboardCard({ children, className = '' }) {
  return (
    <div className={`dashboard-card ${className}`}>
      {children}
    </div>
  );
}
export default DashboardCard;