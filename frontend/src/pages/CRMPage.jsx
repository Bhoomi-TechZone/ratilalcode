import React from 'react';
import CustomerProfile from '../components/CRM/CustomerProfile';
import FeedbackSystem from '../components/CRM/FeedbackSystem';
import ComplaintsModule from '../components/CRM/ComplaintsModule';
import CommunicationLog from '../components/CRM/CommunicationLog';
import LoyaltyPoints from '../components/CRM/LoyaltyPoints';

const CRMPage = () => {
  return (
    <div className="p-6 space-y-6">
      <CustomerProfile />
      {/* <FeedbackSystem />
      <ComplaintsModule />
      <CommunicationLog />
      <LoyaltyPoints /> */}
    </div>
  );
};

export default CRMPage;
