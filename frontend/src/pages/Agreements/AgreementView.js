import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import html2pdf from 'html2pdf.js';
import { agreementAPI } from '../../services/api';
import './AgreementView.css';

const AgreementView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const documentRef = useRef(null);
  const [agreement, setAgreement] = useState(null);
  const [versions, setVersions] = useState([]);
  const [acceptances, setAcceptances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedVersionNumber, setSelectedVersionNumber] = useState(0);
  const [showNewVersionForm, setShowNewVersionForm] = useState(false);
  const [newVersionContent, setNewVersionContent] = useState('');
  const [newVersionSummary, setNewVersionSummary] = useState('');
  const [signatureRole, setSignatureRole] = useState('');
  const [signatureName, setSignatureName] = useState('');
  const [signatureError, setSignatureError] = useState('');

  const loadAgreement = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await agreementAPI.getAgreement(id);
      setAgreement(data.agreement);
      setVersions(data.versions || []);
      setAcceptances(data.acceptances || []);
    } catch (e) {
      console.error('Failed to load agreement', e);
      setError(e?.response?.data?.message || e.message || 'Failed to load agreement.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAgreement(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!agreement || versions.length === 0) return;
    const requestedVersion = Number(searchParams.get('version'));
    const hasRequestedVersion = versions.some((version) => version.versionNumber === requestedVersion);
    const initialVersion = hasRequestedVersion
      ? requestedVersion
      : agreement.currentVersion || versions[versions.length - 1]?.versionNumber || 1;
    setSelectedVersionNumber(initialVersion);
    setNewVersionContent(versions[versions.length - 1]?.content || '');
  }, [agreement, versions, searchParams]);

  if (loading) return <div className="agreement-state" role="status">Loading agreement…</div>;
  if (!agreement) return <div className="agreement-state agreement-state--error">{error || 'Agreement not found.'}</div>;

  const me = JSON.parse(localStorage.getItem('user') || 'null');
  const amTenant = me && agreement.tenant && (me._id === agreement.tenant._id || me.id === agreement.tenant._id);
  const amLandlord = me && agreement.landlord && (me._id === agreement.landlord._id || me.id === agreement.landlord._id);
  const displayedVersion = versions.find((version) => version.versionNumber === selectedVersionNumber) || versions[versions.length - 1];
  const displayedVersionId = displayedVersion?._id;
  const signatureFor = (role) => acceptances.find((acceptance) => (acceptance.version?._id || acceptance.version) === displayedVersionId && acceptance.role === role);
  const landlordSignature = signatureFor('landlord');
  const tenantSignature = signatureFor('tenant');
  const rentAmount = displayedVersion?.content?.match(/Rent:\s*([^\n]+)/i)?.[1] || 'Not specified';
  const depositAmount = displayedVersion?.content?.match(/Deposit:\s*([^\n]+)/i)?.[1] || 'Not specified';
  const agreementStart = agreement.effectiveDate ? new Date(agreement.effectiveDate).toLocaleDateString() : 'Not specified';
  const agreementEnd = agreement.expiryDate ? new Date(agreement.expiryDate).toLocaleDateString() : 'Not specified';
  const createdDate = agreement.createdAt ? new Date(agreement.createdAt).toLocaleDateString() : 'Not specified';

  const refresh = async () => { await loadAgreement(); };
  const openSignatureModal = (role) => {
    setSignatureRole(role);
    setSignatureName(me?.name || '');
    setSignatureError('');
  };
  const handleSignatureSubmit = async (event) => {
    event.preventDefault();
    const normalizedName = signatureName.trim();
    if (!normalizedName) { setSignatureError('Please enter your full name to continue.'); return; }
    if (!displayedVersion) return;
    setActionLoading(true);
    setSignatureError('');
    try {
      if (signatureRole === 'landlord') {
        await agreementAPI.signVersion(agreement._id, displayedVersion.versionNumber, normalizedName);
      } else {
        await agreementAPI.acceptVersion(agreement._id, displayedVersion.versionNumber, normalizedName);
      }
      setSignatureRole('');
      alert('Agreement signed successfully.');
      await refresh();
    } catch (e) { setSignatureError(e?.response?.data?.message || e.message || 'Failed to sign the agreement.'); }
    finally { setActionLoading(false); }
  };
  const handleDecline = async () => {
    if (!window.confirm('Decline this agreement? This will notify the landlord.')) return;
    setActionLoading(true);
    try { await agreementAPI.decline(agreement._id); alert('Agreement declined. Landlord will be notified.'); await refresh(); }
    catch (e) { alert(e?.response?.data?.message || e.message || 'Failed to decline'); }
    finally { setActionLoading(false); }
  };
  const handleRequestChanges = async () => {
    setActionLoading(true);
    try { await agreementAPI.requestChanges(agreement._id, displayedVersion.versionNumber); alert('Change request recorded. Landlord has been notified.'); await refresh(); }
    catch (e) { alert(e?.response?.data?.message || e.message || 'Failed to request changes'); }
    finally { setActionLoading(false); }
  };
  const handleSendVersion = async (versionNumber) => {
    if (!window.confirm(`Send version ${versionNumber} to tenant?`)) return;
    setActionLoading(true);
    try { await agreementAPI.sendVersion(agreement._id, versionNumber); alert(`Version ${versionNumber} sent to tenant.`); await refresh(); }
    catch (e) { alert(e?.response?.data?.message || e.message || 'Failed to send version'); }
    finally { setActionLoading(false); }
  };
  const handleExecute = async (versionNumber) => {
    if (!window.confirm(`Execute (finalize) version ${versionNumber}? This will lock the agreement.`)) return;
    setActionLoading(true);
    try { await agreementAPI.execute(agreement._id, versionNumber); alert('Agreement executed and locked.'); await refresh(); }
    catch (e) { alert(e?.response?.data?.message || e.message || 'Failed to execute agreement'); }
    finally { setActionLoading(false); }
  };
  const handleCreateVersion = async () => {
    if (!newVersionContent) { alert('Please enter content for the new version'); return; }
    setActionLoading(true);
    try { await agreementAPI.createVersion(agreement._id, { content: newVersionContent, changeSummary: newVersionSummary }); alert('New version created as draft.'); await refresh(); setShowNewVersionForm(false); }
    catch (e) { alert(e?.response?.data?.message || e.message || 'Failed to create version'); }
    finally { setActionLoading(false); }
  };
  const handleVersionChange = (event) => {
    const version = Number(event.target.value);
    setSelectedVersionNumber(version);
    setSearchParams({ version: String(version) });
  };
  const handleDownload = async () => {
    if (!documentRef.current) return;
    setDownloadLoading(true);
    try {
      await html2pdf().set({
        margin: [10, 10, 10, 10],
        filename: `${agreement.agreementId || 'rental-agreement'}-v${displayedVersion?.versionNumber || 1}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      }).from(documentRef.current).save();
    } catch (e) {
      console.error('Failed to create PDF', e);
      alert('Unable to download the agreement PDF. Please try printing instead.');
    } finally { setDownloadLoading(false); }
  };

  return (
    <main className="agreement-view-page">
      <div className="agreement-controls no-print">
        <button onClick={() => navigate(-1)} className="btn-outline">Back</button>
        <div className="agreement-controls__actions">
          <button onClick={() => window.print()} className="btn-outline">Print Agreement</button>
          <button onClick={handleDownload} className="btn-primary" disabled={downloadLoading}>{downloadLoading ? 'Preparing PDF…' : 'Download PDF'}</button>
        </div>
      </div>

      <article className="agreement-document" ref={documentRef}>
        <header className="agreement-document__header">
          <div>
            <p className="agreement-document__eyebrow">Residential tenancy document</p>
            <h1>Rental Agreement</h1>
            <p className="agreement-document__reference">Reference {agreement.agreementId}</p>
          </div>
          <div className="agreement-document__meta">
            <div><span>Version</span><strong>v{displayedVersion?.versionNumber || '—'}</strong></div>
            <div><span>Issue date</span><strong>{createdDate}</strong></div>
          </div>
        </header>

        <section className="agreement-document__intro">
          This agreement records the rental arrangement for the property and parties identified below. The terms in this document are those of version {displayedVersion?.versionNumber || '—'}.
        </section>

        <section className="agreement-document__section">
          <h2>1. Parties to the Agreement</h2>
          <div className="agreement-document__details agreement-document__details--two">
            <div><span>Landlord / property manager</span><strong>{agreement.landlord?.name || 'Not specified'}</strong></div>
            <div><span>Tenant</span><strong>{agreement.tenant?.name || 'Not specified'}</strong></div>
          </div>
        </section>

        <section className="agreement-document__section">
          <h2>2. Property and Lease Details</h2>
          <div className="agreement-document__details agreement-document__details--two">
            <div><span>Property</span><strong>{agreement.room?.title || 'Not specified'}</strong></div>
            <div><span>Location</span><strong>{agreement.room?.location || 'Not specified'}</strong></div>
            <div><span>Lease commencement</span><strong>{agreementStart}</strong></div>
            <div><span>Lease expiry</span><strong>{agreementEnd}</strong></div>
          </div>
        </section>

        <section className="agreement-document__section">
          <h2>3. Financial Information</h2>
          <div className="agreement-document__details agreement-document__details--two">
            <div><span>Monthly rent</span><strong>{rentAmount}</strong></div>
            <div><span>Security deposit</span><strong>{depositAmount}</strong></div>
          </div>
        </section>

        <section className="agreement-document__section agreement-document__terms">
          <h2>4. Terms and Conditions</h2>
          <div className="agreement-document__terms-content">{displayedVersion?.content || 'No terms were provided for this version.'}</div>
        </section>

        <section className="agreement-document__section agreement-document__signatures">
          <h2>5. Signatures &amp; Acceptance</h2>
          <p>By signing below, the parties acknowledge the agreement details and terms set out in this document.</p>
          <div className="agreement-document__signature-grid">
            <div className={`agreement-signature ${landlordSignature ? 'agreement-signature--signed' : ''}`}><div className="signature-line">{landlordSignature?.signatureName || ''}</div><strong>{agreement.landlord?.name || 'Landlord / property manager'}</strong><span>{landlordSignature ? <>Signed by {landlordSignature.signatureName || landlordSignature.user?.name} on {new Date(landlordSignature.acceptedAt).toLocaleDateString()}</> : 'Pending landlord signature'}</span></div>
            <div className={`agreement-signature ${tenantSignature ? 'agreement-signature--signed' : ''}`}><div className="signature-line">{tenantSignature?.signatureName || ''}</div><strong>{agreement.tenant?.name || 'Tenant'}</strong><span>{tenantSignature ? <>Signed by {tenantSignature.signatureName || tenantSignature.user?.name} on {new Date(tenantSignature.acceptedAt).toLocaleDateString()}</> : 'Pending tenant signature'}</span></div>
          </div>
          {landlordSignature && tenantSignature && <div className="agreement-document__fully-signed">✓ Agreement fully signed</div>}
        </section>

        <footer className="agreement-document__footer">{agreement.agreementId} · Version {displayedVersion?.versionNumber || '—'} · {agreement.status?.replace(/_/g, ' ')}</footer>
      </article>

      <section className="agreement-workflow no-print">
        <div className="agreement-workflow__header"><h2>Agreement workflow</h2><span className={`agreement-status-badge agreement-status-${agreement.status.replace(/\s+/g, '-').toLowerCase()}`}>{agreement.status.replace(/_/g, ' ')}</span></div>
        <div className="agreement-actions-row">
          <label className="agreement-select-label"><span>Preview version</span><select value={selectedVersionNumber} onChange={handleVersionChange}>{versions.map((version) => <option key={version._id} value={version.versionNumber}>v{version.versionNumber} — {version.status}{version.changeSummary ? ` — ${version.changeSummary}` : ''}</option>)}</select></label>
          {amLandlord && <button className="btn-outline" onClick={() => setShowNewVersionForm((show) => !show)}>{showNewVersionForm ? 'Cancel New Version' : 'Create New Version'}</button>}
          {amLandlord && displayedVersion?.status === 'draft' && !landlordSignature && <button className="btn-primary" onClick={() => openSignatureModal('landlord')} disabled={actionLoading}>Sign Agreement</button>}
          {amLandlord && landlordSignature && <span className="agreement-signed-status">✓ Signed by {landlordSignature.signatureName || landlordSignature.user?.name}</span>}
          {amLandlord && displayedVersion?.status === 'draft' && <button className="btn-primary" onClick={() => handleSendVersion(displayedVersion.versionNumber)} disabled={actionLoading}>Send to Tenant</button>}
          {amLandlord && displayedVersion?.status === 'accepted' && <button className="btn-primary" onClick={() => handleExecute(displayedVersion.versionNumber)} disabled={actionLoading}>Execute Agreement</button>}
          {amTenant && displayedVersion?.status === 'sent' && <>{!tenantSignature ? <button className="btn-primary" onClick={() => openSignatureModal('tenant')} disabled={actionLoading}>Sign Agreement</button> : <span className="agreement-signed-status">✓ Signed by {tenantSignature.signatureName || tenantSignature.user?.name}</span>}<button className="btn-outline" onClick={handleRequestChanges} disabled={actionLoading}>Request Changes</button><button className="btn-danger" onClick={handleDecline} disabled={actionLoading}>Decline</button></>}
        </div>
        {showNewVersionForm && amLandlord && <div className="new-version-panel"><label><span>Change summary</span><input type="text" value={newVersionSummary} onChange={(e) => setNewVersionSummary(e.target.value)} /></label><label><span>Version content</span><textarea value={newVersionContent} onChange={(e) => setNewVersionContent(e.target.value)} rows={8} /></label><div className="agreement-actions-row"><button className="btn-outline" onClick={() => setShowNewVersionForm(false)}>Cancel</button><button className="btn-primary" onClick={handleCreateVersion} disabled={actionLoading}>{actionLoading ? 'Creating…' : 'Create Version'}</button></div></div>}
      </section>

      {signatureRole && <div className="agreement-signature-modal no-print" role="dialog" aria-modal="true" aria-labelledby="signature-modal-title"><form className="agreement-signature-modal__card" onSubmit={handleSignatureSubmit}><h2 id="signature-modal-title">Sign Agreement</h2><p>By entering your name below, you confirm that you have reviewed and agree to this rental agreement.</p><label><span>Full Name</span><input autoFocus value={signatureName} onChange={(event) => setSignatureName(event.target.value)} placeholder="Enter your full name" /></label>{signatureError && <div className="agreement-signature-modal__error">{signatureError}</div>}<div className="agreement-signature-modal__actions"><button type="button" className="btn-outline" onClick={() => setSignatureRole('')} disabled={actionLoading}>Cancel</button><button type="submit" className="btn-primary" disabled={actionLoading}>{actionLoading ? 'Signing…' : 'Sign & Confirm'}</button></div></form></div>}
    </main>
  );
};

export default AgreementView;
