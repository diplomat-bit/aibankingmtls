import forge from 'node-forge';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const certsDir = path.join(__dirname, '..', '.certs');

export function ensureCertsExist() {
  if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir, { recursive: true });
  }

  const keyPath = path.join(certsDir, 'client-key.pem');
  const certPath = path.join(certsDir, 'client-cert.pem');

  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return {
      key: fs.readFileSync(keyPath, 'utf8'),
      cert: fs.readFileSync(certPath, 'utf8'),
    };
  }

  console.log('Generating new mTLS client certificate and key...');

  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);

  const attrs = [
    { name: 'commonName', value: 'aibanking-client' },
    { name: 'countryName', value: 'US' },
    { shortName: 'ST', value: 'California' },
    { name: 'localityName', value: 'San Francisco' },
    { name: 'organizationName', value: 'AI Banking' },
    { shortName: 'OU', value: 'Engineering' }
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  // Self-sign the certificate
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const pemCert = forge.pki.certificateToPem(cert);
  const pemKey = forge.pki.privateKeyToPem(keys.privateKey);

  fs.writeFileSync(certPath, pemCert);
  fs.writeFileSync(keyPath, pemKey);

  console.log('\n================================================================');
  console.log('mTLS Client Certificate Generated Successfully!');
  console.log('================================================================');
  console.log('ACTION REQUIRED: You must upload the following certificate to Auth0');
  console.log('1. Go to your Auth0 Dashboard -> Applications -> Applications');
  console.log('2. Select your application ("aibanking" or similar)');
  console.log('3. Go to the "Credentials" tab');
  console.log('4. Under "Client Certificates", click "Add Certificate"');
  console.log('5. Paste the following certificate content:\n');
  console.log(pemCert);
  console.log('================================================================\n');

  return { key: pemKey, cert: pemCert };
}
