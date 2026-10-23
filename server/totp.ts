import crypto from 'crypto';
import QRCode from 'qrcode';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function generateBase32Secret(length = 20): string {
  const bytes = crypto.randomBytes(length);
  let secret = '';
  for (let i = 0; i < length; i++) {
    secret += BASE32_ALPHABET[bytes[i] % 32];
  }
  return secret;
}

function base32ToBuffer(base32: string): Buffer {
  const cleaned = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = '';
  for (let i = 0; i < cleaned.length; i++) {
    const val = BASE32_ALPHABET.indexOf(cleaned[i]);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

export function generateTotpAtCounter(secret: string, counter: number): string {
  const key = base32ToBuffer(secret);
  const buf = Buffer.alloc(8);
  let tmp = counter;
  for (let i = 7; i >= 0; i--) {
    buf[i] = tmp & 0xff;
    tmp = Math.floor(tmp / 256);
  }
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    (((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)) %
    1000000;
  return code.toString().padStart(6, '0');
}

export function verifyTotpCode(secret: string, token: string, window = 2): boolean {
  if (!secret || !token) return false;
  const cleanToken = token.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanToken)) return false;

  const currentCounter = Math.floor(Date.now() / 1000 / 30);
  for (let errorWindow = -window; errorWindow <= window; errorWindow++) {
    const expected = generateTotpAtCounter(secret, currentCounter + errorWindow);
    if (expected === cleanToken) {
      return true;
    }
  }
  return false;
}

export async function generateTotpQrCode(
  accountName: string,
  secret: string,
  issuer = 'Evasion Soleil'
): Promise<{ otpauthUrl: string; qrCodeDataUrl: string }> {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const issuerParam = encodeURIComponent(issuer);
  const otpauthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${issuerParam}&algorithm=SHA1&digits=6&period=30`;
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
    width: 220,
    margin: 1,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
  return { otpauthUrl, qrCodeDataUrl };
}
