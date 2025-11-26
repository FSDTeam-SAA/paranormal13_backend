exports.passwordResetTemplate = (resetCode, userName) => `
  <div style="font-family: Arial, sans-serif; padding: 16px; background:#f4f7fb;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:8px;padding:24px;
      box-shadow:0 8px 24px rgba(15,23,42,0.08);">
      <h2 style="color:#2563eb;margin-top:0;">Reset your MediRemind password</h2>
      <p style="color:#4b5563;">Hi ${userName || 'there'},</p>
      <p style="color:#4b5563;">
        We received a request to reset your MediRemind password. Use the verification code below to continue:
      </p>
      <div style="text-align:center;margin:24px 0;">
        <span style="font-size:32px;letter-spacing:8px;font-weight:bold;color:#111827;
          padding:12px 24px;border-radius:999px;border:2px dashed #e5e7eb;display:inline-block;">
          ${resetCode}
        </span>
      </div>
      <p style="color:#6b7280;font-size:14px;">
        This code will expire in 10 minutes. If you didn't request a password reset, you can safely ignore this email.
      </p>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">
        Stay healthy, stay on track 💙<br/>The MediRemind Team
      </p>
    </div>
  </div>
`;

exports.welcomeTemplate = (userName, role) => `
  <div style="font-family: Arial, sans-serif; padding: 16px; background:#f4f7fb;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:8px;padding:24px;
      box-shadow:0 8px 24px rgba(15,23,42,0.08);">
      <h2 style="color:#2563eb;margin-top:0;">Welcome to MediRemind 🎉</h2>
      <p style="color:#4b5563;">Hi ${userName || 'there'},</p>
      <p style="color:#4b5563;">
        Your ${role || 'MediRemind'} account is ready. You can now manage your medications, connect with doctors,
        and order from nearby pharmacies.
      </p>
      <p style="color:#6b7280;font-size:14px;">
        If you ever have questions, just reply to this email.
      </p>
      <p style="color:#9ca3af;font-size:12px;margin-top:24px;">
        Stay healthy, stay on track 💙<br/>The MediRemind Team
      </p>
    </div>
  </div>
`;
