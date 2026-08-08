require('dotenv').config({ path: __dirname + '/../.env' });
const axios = require('axios');
const connectDb = require('../config/dbConnection');
const RentApplication = require('../models/RentApplication');
const User = require('../models/User');
const Room = require('../models/Room');

const API = 'http://localhost:5000';

async function main(){
  await connectDb();

  // login landlord
  console.log('Logging in landlord...');
  const lresp = await axios.post(`${API}/auth/login`, { username: 'king', password: 'king' });
  const landlord = lresp.data;
  const ltoken = landlord.token;
  console.log('Landlord id', landlord._id);

  // create a room directly via the Room model (avoid strict upload requirements)
  console.log('Creating test room in DB');
  const room = await Room.create({ title: 'Test Room For Agreement', location: 'Kathmandu', price: 10000, bedrooms: 1, bathrooms: 1, area: '350 sq ft', maxRenters: 1, image: 'https://placehold.co/600x400', createdBy: landlord._id });
  console.log('Created room', room._id);

  // login tenant
  console.log('Logging in tenant...');
  const tresp = await axios.post(`${API}/auth/login`, { username: 'qwer', password: 'qwer' });
  const tenant = tresp.data;
  console.log('Tenant id', tenant._id);

  // ensure tenant exists in DB
  const tenantUser = await User.findOne({ _id: tenant._id });
  if(!tenantUser){
    console.error('Tenant not found in DB');
    process.exit(1);
  }

  // create RentApplication directly in DB with status 'selected'
  console.log('Creating RentApplication (selected)');
  const app = await RentApplication.create({ room: room._id, applicant: tenant._id, owner: landlord._id, status: 'selected' });
  console.log('Created application', app._id);

  // create agreement via API as landlord
  console.log('Creating agreement via API');
  const agreementPayload = { applicationId: app._id, effectiveDate: new Date().toISOString().slice(0,10), expiryDate: new Date(Date.now()+1000*60*60*24*30).toISOString().slice(0,10), content: 'Rent: NPR 10000\nDeposit: NPR 5000\nTerms: Standard', summary: 'Initial draft' };
  const agrResp = await axios.post(`${API}/agreements`, agreementPayload, { headers: { Authorization: 'Bearer ' + ltoken } });
  const agreement = agrResp.data.agreement;
  console.log('Agreement created', agreement._id, agreement.agreementId);

  // tenant fetch agreements
  console.log('Tenant fetching /agreements/mine');
  const tenantAgs = await axios.get(`${API}/agreements/mine`, { headers: { Authorization: 'Bearer ' + tenant.token } });
  console.log('Tenant agreements count', tenantAgs.data.length);

  // tenant accepts version 1
  console.log('Tenant accepting version');
  const acceptResp = await axios.post(`${API}/agreements/${agreement._id}/versions/accept`, { versionNumber: 1 }, { headers: { Authorization: 'Bearer ' + tenant.token } });
  console.log('Accept response', acceptResp.data);

  process.exit(0);
}

main().catch(err => { console.error('Error in test flow', err.response?.data || err.message); process.exit(1); });
