import { customersRepo } from '../repositories/customers.repo.js';
import { customerOtpsRepo } from '../repositories/customerOtps.repo.js';
import { generateOtp, otpMatches } from '../lib/otp.js';
import { signCustomerToken } from '../lib/jwt.js';
import { sendOtpEmail } from '../lib/mailer/index.js';
import { OTP_TTL_MS, OTP_MAX_ATTEMPTS } from '../config/constants.js';
import { badRequest, unauthorized } from '../lib/errors.js';

// Email-OTP identity: no passwords anywhere. Request → email a one-time code. Verify →
// find-or-create the customer and issue a session token.
export const customerAuthService = {
  async requestOtp(rawEmail: string): Promise<void> {
    const email = rawEmail.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw badRequest('Enter a valid email address');
    const { code, hash } = generateOtp();
    await customerOtpsRepo.create(email, hash, new Date(Date.now() + OTP_TTL_MS));
    await sendOtpEmail(email, code); // ConsoleMailer logs it in dev
  },

  async verifyOtp(rawEmail: string, code: string): Promise<{ customer: { id: string; email: string; kycStatus: string; fullName: string | null }; token: string; isNew: boolean }> {
    const email = rawEmail.trim().toLowerCase();
    const otp = await customerOtpsRepo.latestValid(email);
    if (!otp) throw unauthorized('Code expired or not found — request a new one');
    if (otp.attempts >= OTP_MAX_ATTEMPTS) throw unauthorized('Too many attempts — request a new code');

    if (!otpMatches(code.trim(), otp.codeHash)) {
      await customerOtpsRepo.incrementAttempts(otp.id);
      throw unauthorized('Incorrect code');
    }
    await customerOtpsRepo.consume(otp.id);

    let customer = await customersRepo.findByEmail(email);
    const isNew = !customer;
    if (!customer) customer = await customersRepo.create(email);
    await customersRepo.touchLogin(customer.id);

    return {
      customer: { id: customer.id, email: customer.email, kycStatus: customer.kycStatus, fullName: customer.fullName },
      token: signCustomerToken(customer.id),
      isNew,
    };
  },
};
