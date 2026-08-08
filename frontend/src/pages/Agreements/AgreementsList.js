import React, { useEffect, useState } from 'react';
import { agreementAPI } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const AgreementsList = () => {
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await agreementAPI.getMine();
        setAgreements(data);
      } catch (e) {
        console.error('Failed to load agreements', e);
        setAgreements([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Rental Agreements</h1>
      {loading ? (
        <p>Loading…</p>
      ) : agreements.length === 0 ? (
        <p>No agreements found.</p>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {agreements.map((a) => (
            <div key={a._id} style={{ background: '#fff', border: '1px solid #e5e7eb', padding: 16, borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{a.agreementId}</div>
                  <div style={{ color: '#6b7280' }}>{a.room?.title}</div>
                  <div style={{ fontSize: '0.9rem', marginTop: 6 }}>
                    <strong>Status:</strong> {a.status}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => navigate(`/agreements/${a._id}`)} className="btn-outline">View Agreement</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AgreementsList;
