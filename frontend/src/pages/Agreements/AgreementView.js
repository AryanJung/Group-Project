import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { agreementAPI } from '../../services/api';
import './AgreementView.css';

const AgreementView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agreement, setAgreement] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Hooks for versioning and UI state must be declared unconditionally
  const [selectedVersionNumber, setSelectedVersionNumber] = useState(0);
  const [showNewVersionForm, setShowNewVersionForm] = useState(false);
  const [newVersionContent, setNewVersionContent] = useState('');
  const [newVersionSummary, setNewVersionSummary] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await agreementAPI.getAgreement(id);
        setAgreement(data.agreement);
        setVersions(data.versions || []);
      } catch (e) {
        console.error('Failed to load agreement', e);
        setError(e?.response?.data?.message || e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // When agreement or versions load, set selectedVersionNumber and prefill new version content
  useEffect(() => {
    if (agreement && versions.length > 0) {
      const initial = agreement.currentVersion || versions[versions.length - 1]?.versionNumber || 1;
      setSelectedVersionNumber(initial);
      setNewVersionContent(versions[versions.length - 1]?.content || '');
    }
  }, [agreement, versions]);

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!agreement) return <div style={{ padding: 24 }}>{error || 'Agreement not found'}</div>;

  const me = JSON.parse(localStorage.getItem('user') || 'null');
  const amTenant = me && agreement.tenant && (me._id === agreement.tenant._id || me.id === agreement.tenant._id);
  const amLandlord = me && agreement.landlord && (me._id === agreement.landlord._id || me.id === agreement.landlord._id);

  const displayedVersion = versions.find((v) => v.versionNumber === selectedVersionNumber) || versions[versions.length - 1];


  const handleAccept = async () => {
    if (!displayedVersion) return;
    setActionLoading(true);
    try {
      await agreementAPI.acceptVersion(agreement._id, displayedVersion.versionNumber);
      alert('Agreement accepted (tenant). Landlord will be notified.');
      // reload
      const data = await agreementAPI.getAgreement(id);
      setAgreement(data.agreement);
      setVersions(data.versions || []);
    } catch (e) {
      alert(e?.response?.data?.message || e.message || 'Failed to accept');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!window.confirm('Decline this agreement? This will notify the landlord.')) return;
    setActionLoading(true);
    try {
      await agreementAPI.decline(agreement._id);
      alert('Agreement declined. Landlord will be notified.');
      const data = await agreementAPI.getAgreement(id);
      setAgreement(data.agreement);
    } catch (e) {
      alert(e?.response?.data?.message || e.message || 'Failed to decline');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestChanges = async () => {
    setActionLoading(true);
    try {
      await agreementAPI.requestChanges(agreement._id, displayedVersion.versionNumber);
      alert('Change request recorded. Landlord has been notified.');
      const data = await agreementAPI.getAgreement(id);
      setAgreement(data.agreement);
    } catch (e) {
      alert(e?.response?.data?.message || e.message || 'Failed to request changes');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendVersion = async (versionNumber) => {
    if (!window.confirm(`Send version ${versionNumber} to tenant?`)) return;
    setActionLoading(true);
    try {
      await agreementAPI.sendVersion(agreement._id, versionNumber);
      alert(`Version ${versionNumber} sent to tenant.`);
      const data = await agreementAPI.getAgreement(id);
      setAgreement(data.agreement);
      setVersions(data.versions || []);
    } catch (e) {
      alert(e?.response?.data?.message || e.message || 'Failed to send version');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecute = async (versionNumber) => {
    if (!window.confirm(`Execute (finalize) version ${versionNumber}? This will lock the agreement.`)) return;
    setActionLoading(true);
    try {
      await agreementAPI.execute(agreement._id, versionNumber);
      alert('Agreement executed and locked.');
      const data = await agreementAPI.getAgreement(id);
      setAgreement(data.agreement);
      setVersions(data.versions || []);
    } catch (e) {
      alert(e?.response?.data?.message || e.message || 'Failed to execute agreement');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateVersion = async () => {
    if (!newVersionContent) {
      alert('Please enter content for the new version');
      return;
    }
    setActionLoading(true);
    try {
      await agreementAPI.createVersion(agreement._id, { content: newVersionContent, changeSummary: newVersionSummary });
      alert('New version created as draft.');
      const data = await agreementAPI.getAgreement(id);
      setAgreement(data.agreement);
      setVersions(data.versions || []);
      setShowNewVersionForm(false);
    } catch (e) {
      alert(e?.response?.data?.message || e.message || 'Failed to create version');
    } finally {
      setActionLoading(false);
    }
  };

  // Render a formatted contract
  const rentAmount = displayedVersion?.content?.match(/Rent:\s*([^\n]+)/i)?.[1] || 'See terms';
  const depositAmount = displayedVersion?.content?.match(/Deposit:\s*([^\n]+)/i)?.[1] || 'See terms';
  const agreementStart = agreement.effectiveDate ? new Date(agreement.effectiveDate).toLocaleDateString() : 'Not specified';
  const agreementEnd = agreement.expiryDate ? new Date(agreement.expiryDate).toLocaleDateString() : 'Not specified';

  return (
    <div className="agreement-view-page">
      <div className="agreement-card-shell">
        <header className="agreement-header">
          <div>
            <div className="agreement-label">RENTAL AGREEMENT</div>
            <h1>{agreement.agreementId}</h1>
            <p className="agreement-subtitle">Agreement for {agreement.room?.title}</p>
          </div>
          <div className="agreement-header-meta">
            <span className={`agreement-status-badge agreement-status-${agreement.status.replace(/\s+/g, '-').toLowerCase()}`}>
              {agreement.status.replace(/_/g, ' ')}
            </span>
            <div className="agreement-meta-row">
              <strong>Created:</strong> {new Date(agreement.createdAt).toLocaleDateString()}
            </div>
            <button onClick={() => navigate(-1)} className="btn-outline agreement-back-button">Back</button>
          </div>
        </header>

        <div className="agreement-summary-grid">
          <div className="agreement-summary-card">
            <h3>Parties</h3>
            <div><strong>Landlord:</strong> {agreement.landlord?.name}</div>
            <div><strong>Tenant:</strong> {agreement.tenant?.name}</div>
          </div>
          <div className="agreement-summary-card">
            <h3>Property</h3>
            <div><strong>Title:</strong> {agreement.room?.title}</div>
            <div><strong>Location:</strong> {agreement.room?.location}</div>
          </div>
          <div className="agreement-summary-card">
            <h3>Tenancy</h3>
            <div><strong>Start:</strong> {agreementStart}</div>
            <div><strong>End:</strong> {agreementEnd}</div>
          </div>
          <div className="agreement-summary-card">
            <h3>Financials</h3>
            <div><strong>Rent:</strong> {rentAmount}</div>
            <div><strong>Deposit:</strong> {depositAmount}</div>
          </div>
        </div>

        <section className="agreement-section">
          <div className="section-title-row">
            <h2>Agreement Summary</h2>
            <span className="agreement-detail-pill">Version {displayedVersion?.versionNumber}</span>
          </div>
          <p className="agreement-intro">This document outlines the key terms of the rental arrangement between the landlord and tenant. Please review the complete terms below for the current draft.</p>
          <pre className="agreement-full-terms">{displayedVersion?.content}</pre>
        </section>

        <section className="agreement-section agreement-version-panel">
          <div className="section-title-row">
            <h2>Version Controls</h2>
          </div>
          <div className="agreement-actions-row">
            <label className="agreement-select-label">
              <span>Preview Version</span>
              <select value={selectedVersionNumber} onChange={(e) => setSelectedVersionNumber(parseInt(e.target.value, 10))}>
                {versions.map((v) => (
                  <option key={v._id} value={v.versionNumber}>
                    v{v.versionNumber} — {v.status}{v.changeSummary ? ` — ${v.changeSummary}` : ''}
                  </option>
                ))}
              </select>
            </label>
            {amLandlord && (
              <button className="btn-outline" onClick={() => setShowNewVersionForm((s) => !s)}>
                {showNewVersionForm ? 'Cancel New Version' : 'Create New Version'}
              </button>
            )}
          </div>

          {showNewVersionForm && amLandlord && (
            <div className="new-version-panel">
              <label>
                <span>Change summary</span>
                <input type="text" value={newVersionSummary} onChange={(e) => setNewVersionSummary(e.target.value)} />
              </label>
              <label>
                <span>Version Content</span>
                <textarea value={newVersionContent} onChange={(e) => setNewVersionContent(e.target.value)} rows={8} />
              </label>
              <div className="agreement-actions-row" style={{ justifyContent: 'flex-end' }}>
                <button className="btn-outline" onClick={() => setShowNewVersionForm(false)}>Cancel</button>
                <button className="btn-primary" onClick={handleCreateVersion} disabled={actionLoading}>{actionLoading ? 'Creating…' : 'Create Version'}</button>
              </div>
            </div>
          )}

          {amLandlord && displayedVersion && (
            <div className="agreement-actions-row" style={{ flexWrap: 'wrap' }}>
              {displayedVersion.status === 'draft' && (
                <button className="btn-primary" onClick={() => handleSendVersion(displayedVersion.versionNumber)} disabled={actionLoading}>Send to Tenant</button>
              )}
              {(displayedVersion.status === 'accepted' || (agreement.status === 'final_pending' && displayedVersion.status === 'accepted')) && (
                <button className="btn-primary" onClick={() => handleExecute(displayedVersion.versionNumber)} disabled={actionLoading}>Execute Agreement</button>
              )}
            </div>
          )}
        </section>

        <section className="agreement-section agreement-footer-note">
          <div>Acceptance and requests are recorded digitally through this application workflow.</div>
        </section>

        <footer className="agreement-footer">
          <div>
            <div><strong>Status:</strong> {displayedVersion?.status}</div>
            <div className="agreement-meta-row"><strong>Version:</strong> {displayedVersion?.versionNumber}</div>
          </div>

          <div className="agreement-actions-row">
            {amTenant && displayedVersion?.status === 'sent' && (
              <>
                <button className="btn-primary" onClick={handleAccept} disabled={actionLoading}>Accept Agreement</button>
                <button className="btn-outline" onClick={handleRequestChanges} disabled={actionLoading}>Request Changes</button>
                <button className="btn-danger" onClick={handleDecline} disabled={actionLoading}>Decline</button>
              </>
            )}
          
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AgreementView;
