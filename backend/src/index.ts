import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import passport from 'passport';
import { JWTStrategy } from '@sap/xssec';
import xsenv from '@sap/xsenv';

dotenv.config();

const app = express();

// SAP BTP Security Middleware
try {
  const services = xsenv.getServices({ uaa: { tag: 'xsuaa' } });
  passport.use(new JWTStrategy(services.uaa));
  app.use(passport.initialize());
  // Authenticate using BTP JWT tokens, but allow passthrough for Local Dev mock logic
  app.use((req, res, next) => {
    passport.authenticate('JWT', { session: false }, (err: any, user: any) => {
      if (user) req.user = user;
      next();
    })(req, res, next);
  });
  console.log('SAP XSUAA Security Initialized');
} catch (error) {
  console.warn('WARNING: XSUAA Service not found. Running without BTP security (local dev mode only).');
}
const PORT = process.env.PORT || 5000;

import authRoutes from './routes/auth';
import attendanceRoutes from './routes/attendance';
import worksheetRoutes from './routes/worksheet';
import reportRoutes from './routes/report';
import vendorRoutes from './routes/vendor';
import userRoutes from './routes/user';
import approvalsRoutes from './routes/approvals';

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/worksheet', worksheetRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/user', userRoutes);
app.use('/api/approvals', approvalsRoutes);

// Basic health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'InoxGFL API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

import { s4hanaRequest } from './services/s4hana';
setTimeout(async () => {
  try {
    console.log('--- FETCHING ODATA METADATA FOR DEBUGGING ---');
    const response = await s4hanaRequest('GET', '/sap/opu/odata/sap/Z_INOXGFL_SRV_SRV/$metadata', undefined, { 'Accept': 'application/xml' });
    const xml = String(response);
    const match = xml.match(/<EntityType Name="ApprovalMatrix">[\s\S]*?<\/EntityType>/i) 
               || xml.match(/<EntityType Name="ApprovalMatrix"[\s\S]*?<\/EntityType>/i);
    if (match) {
      console.log('ApprovalMatrix Entity Metadata:\n', match[0]);
    } else {
      console.log('Could not find ApprovalMatrix Entity in metadata. First 1000 chars of metadata:\n', xml.substring(0, 1000));
    }
    console.log('--- END ODATA METADATA DEBUG ---');
  } catch (err: any) {
    console.error('Failed to fetch metadata on startup:', err.message);
  }
}, 5000);
