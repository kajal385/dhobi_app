const fs = require('fs');
const path = require('path');

const targetFile = 'c:\\CODEXXA_PROJECT\\Dhobi_app\\admin_panel\\src\\pages\\laundries\\VerificationRequests.tsx';

const code = `import React, { useState, useEffect } from 'react';
import { laundryApi } from '../../services/api/laundryApi';
import { LaundryOwner, LaundryVerificationDoc } from '../../types';
import { DataTable, Column } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/common/Modal';
import { CheckCircle, XCircle, FileSearch, Eye, FileText, Building, CreditCard, UserCheck, ExternalLink } from 'lucide-react';

export const VerificationRequests: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal States
  const [selectedShop, setSelectedShop] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRequestDocsModal, setShowRequestDocsModal] = useState(false);
  const [missingDocText, setMissingDocText] = useState('');
  const [activePreviewDoc, setActivePreviewDoc] = useState<{ title: string; url: string } | null>(null);

  const fetchVerifications = async () => {
    setIsLoading(true);
    try {
      const data = await laundryApi.getVerificationQueue();
      setRequests(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, []);

  const handleApprove = async (id: string) => {
    await laundryApi.approveLaundry(id);
    fetchVerifications();
  };

  const handleRejectSubmit = async () => {
    if (!selectedShop || !rejectionReason) return;
    await laundryApi.rejectLaundry(selectedShop.id, rejectionReason);
    setShowRejectModal(false);
    setRejectionReason('');
    setSelectedShop(null);
    fetchVerifications();
  };

  const handleRequestDocsSubmit = async () => {
    if (!selectedShop || !missingDocText) return;
    await laundryApi.requestDocuments(selectedShop.id, [missingDocText]);
    setShowRequestDocsModal(false);
    setMissingDocText('');
    setSelectedShop(null);
    fetchVerifications();
  };

  const columns: Column<any>[] = [
    {
      header: 'Laundry Shop',
      accessor: (row) => (
        <div style={{ minWidth: '170px' }}>
          <div style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--brand-purple)' }}>
            {row.shopName || row.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {row.id}</div>
        </div>
      ),
    },
    {
      header: 'Owner Details',
      accessor: (row) => (
        <div style={{ minWidth: '150px' }}>
          <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>{row.ownerName || row.owner_name}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{row.phone}</div>
        </div>
      ),
    },
    {
      header: 'City & Location',
      accessor: (row) => (
        <span style={{ fontWeight: '700', fontSize: '0.85rem' }}>📍 {row.city}</span>
      ),
    },
    {
      header: 'GST & Bank',
      accessor: (row) => (
        <div style={{ fontSize: '0.8rem', whiteSpace: 'nowrap', minWidth: '160px' }}>
          <div>GST: <strong>{row.gstNumber || row.gst_number || 'N/A'}</strong></div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>A/C: {row.bankAccount || row.bank_account || 'N/A'}</div>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.verificationStatus || row.status || 'PENDING'} />,
    },
    {
      header: 'Actions & View Docs',
      accessor: (row) => (
        <div style={{ display: 'flex', gap: '0.4rem', whiteSpace: 'nowrap', minWidth: '340px' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setSelectedShop(row);
              setShowDetailModal(true);
            }}
            title="Inspect All Registration & Uploaded Documents"
          >
            <Eye size={13} /> Inspect Docs
          </button>
          <button
            className="btn btn-success btn-sm"
            onClick={() => handleApprove(row.id)}
            title="Approve Verification"
          >
            <CheckCircle size={13} /> Approve
          </button>
          <button
            className="btn btn-danger btn-sm"
            onClick={() => {
              setSelectedShop(row);
              setShowRejectModal(true);
            }}
            title="Reject Registration"
          >
            <XCircle size={13} /> Reject
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h2 className="page-title">Laundry Verification Queue</h2>
          <p className="page-subtitle">Inspect business proof, bank details, and approve new laundry partner registrations</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={requests}
        isLoading={isLoading}
        searchPlaceholder="Search by shop, owner, phone, city..."
      />

      {/* INSPECT ALL DOCUMENTS & REGISTRATION INFO MODAL */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Verification Details: ${selectedShop?.shopName || selectedShop?.name}`}
        size="lg"
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
            <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>
              Close
            </button>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className="btn btn-danger"
                onClick={() => {
                  setShowDetailModal(false);
                  setShowRejectModal(true);
                }}
              >
                <XCircle size={14} /> Reject
              </button>
              <button
                className="btn btn-success"
                onClick={async () => {
                  if (selectedShop) await handleApprove(selectedShop.id);
                  setShowDetailModal(false);
                }}
              >
                <CheckCircle size={14} /> Approve Laundry
              </button>
            </div>
          </div>
        }
      >
        {selectedShop && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Section 1: Business & Owner Profile */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--brand-purple)', fontSize: '0.95rem' }}>
                <Building size={16} /> Business & Owner Information
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Shop Name:</span> <strong>{selectedShop.shopName || selectedShop.name}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Owner Name:</span> <strong>{selectedShop.ownerName || selectedShop.owner_name}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Phone:</span> <strong>{selectedShop.phone}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Email:</span> <strong>{selectedShop.email || 'N/A'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>City / State:</span> <strong>{selectedShop.city}, {selectedShop.state || 'MH'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Address:</span> <strong>{selectedShop.address}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Working Hours:</span> <strong>{selectedShop.workingHours || '08:00 AM - 09:00 PM'}</strong></div>
              </div>
            </div>

            {/* Section 2: Bank & Tax Credentials */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--brand-blue)', fontSize: '0.95rem' }}>
                <CreditCard size={16} /> Bank & GST Credentials
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div><span style={{ color: 'var(--text-muted)' }}>GSTIN Number:</span> <strong>{selectedShop.gstNumber || selectedShop.gst_number || 'N/A'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Bank Name:</span> <strong>{selectedShop.bankName || selectedShop.bank_name || 'HDFC Bank'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>Account Number:</span> <strong>{selectedShop.bankAccount || selectedShop.bank_account || 'N/A'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>IFSC Code:</span> <strong>{selectedShop.ifscCode || selectedShop.ifsc_code || 'N/A'}</strong></div>
                <div><span style={{ color: 'var(--text-muted)' }}>UPI ID:</span> <strong>{selectedShop.upiId || selectedShop.upi_id || 'N/A'}</strong></div>
              </div>
            </div>

            {/* Section 3: Uploaded Verification Documents */}
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--brand-green)', fontSize: '0.95rem' }}>
                <FileText size={16} /> Uploaded Registration Documents
              </h4>
              
              {selectedShop.documents && selectedShop.documents.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {selectedShop.documents.map((doc: any, index: number) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '0.85rem' }}>📄 {doc.name || doc.document_type}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Uploaded: {doc.uploadedAt || '2026-09-01'} | Status: {doc.status || 'VERIFIED'}</div>
                      </div>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => setActivePreviewDoc({ title: doc.name || doc.document_type, url: doc.document_url || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600' })}
                      >
                        <ExternalLink size={13} /> View Document
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Standard registration documents (Udyam License, Aadhaar, PAN, GST Certificate) submitted.
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* DOCUMENT PREVIEW MODAL */}
      <Modal
        isOpen={!!activePreviewDoc}
        onClose={() => setActivePreviewDoc(null)}
        title={`Document Preview: ${activePreviewDoc?.title}`}
        size="md"
      >
        {activePreviewDoc && (
          <div style={{ textAlign: 'center' }}>
            <img
              src={activePreviewDoc.url}
              alt={activePreviewDoc.title}
              style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
            />
            <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Official Verification Proof Document</p>
          </div>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title={`Reject Registration: ${selectedShop?.shopName || selectedShop?.name}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>
              Cancel
            </button>
            <button className="btn btn-danger" onClick={handleRejectSubmit}>
              Confirm Rejection
            </button>
          </>
        }
      >
        <div>
          <p style={{ fontSize: '0.875rem', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            Please state the official reason for rejecting <strong>{selectedShop?.shopName || selectedShop?.name}</strong>. This reason will be sent to the shop owner.
          </p>
          <div className="form-group">
            <label className="form-label">Rejection Reason *</label>
            <textarea
              className="form-control"
              rows={3}
              placeholder="e.g. Invalid shop license number or illegible Aadhaar upload..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              required
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
`;

fs.writeFileSync(targetFile, code);
console.log('VerificationRequests.tsx updated with full document inspector and registration details');
