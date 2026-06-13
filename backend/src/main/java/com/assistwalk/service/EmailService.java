package com.assistwalk.service;

import com.assistwalk.model.Alert;
import com.assistwalk.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;
import java.time.format.DateTimeFormatter;

@Service
@Slf4j
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${spring.mail.username}")
    private String fromEmail;

    // ── Welcome email (account creation) ─────────────────────
    public void sendWelcomeEmail(User user, String tempPassword) {
        String prenom = user.getPrenom() != null ? user.getPrenom() : "User";
        String html = """
            <!DOCTYPE html>
            <html><head><meta charset="UTF-8"></head>
            <body style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;margin:0;padding:0;">
              <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;
                          overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                <div style="background:linear-gradient(135deg,#2563eb,#7c3aed);
                            padding:32px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800;">AssistWalk</h1>
                  <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">
                    Assistance system for visually impaired
                  </p>
                </div>
                <div style="padding:32px;">
                  <h2 style="color:#111827;font-size:20px;margin:0 0 8px;">Welcome, %s!</h2>
                  <p style="color:#6b7280;font-size:14px;margin:0 0 24px;line-height:1.6;">
                    Your AssistWalk account has been created. Here are your credentials:
                  </p>
                  <div style="background:#f8fafc;border:1px solid #e5e7eb;
                              border-radius:12px;padding:20px;margin-bottom:24px;">
                    <div style="margin-bottom:12px;">
                      <p style="font-size:11px;color:#9ca3af;margin:0 0 3px;
                                 text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Email</p>
                      <p style="font-size:15px;font-weight:700;color:#111827;margin:0;">%s</p>
                    </div>
                    <div>
                      <p style="font-size:11px;color:#9ca3af;margin:0 0 3px;
                                 text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">
                        Temporary password
                      </p>
                      <p style="font-size:22px;font-weight:800;color:#2563eb;
                                 margin:0;letter-spacing:2px;font-family:monospace;">%s</p>
                    </div>
                  </div>
                  <div style="background:#fffbeb;border:1px solid #fde68a;
                              border-radius:10px;padding:14px;margin-bottom:24px;">
                    <p style="font-size:13px;color:#92400e;margin:0;line-height:1.5;">
                      ⚠️ For security reasons, you must
                      <strong>change your password</strong> on your first login.
                    </p>
                  </div>
                  <div style="text-align:center;margin-bottom:24px;">
                    <a href="%s/login" style="display:inline-block;background:#2563eb;
                       color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;
                       font-weight:700;font-size:15px;box-shadow:0 4px 12px rgba(37,99,235,0.3);">
                      Sign in →
                    </a>
                  </div>
                  <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">
                    If you were not expecting this message, please ignore this email.
                  </p>
                </div>
                <div style="background:#f9fafb;padding:16px;text-align:center;
                            border-top:1px solid #e5e7eb;">
                  <p style="font-size:12px;color:#9ca3af;margin:0;">
                    © 2024 AssistWalk — All rights reserved
                  </p>
                </div>
              </div>
            </body></html>
            """.formatted(prenom, user.getEmail(), tempPassword, frontendUrl);
        sendHtml(user.getEmail(), "🔐 Your AssistWalk credentials", html);
    }

    // ── Password reset email (admin-initiated) ────────────────
    public void sendPasswordResetEmail(User user, String tempPassword) {
        String prenom = user.getPrenom() != null ? user.getPrenom() : "User";
        String html = """
            <!DOCTYPE html>
            <html><body style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;margin:0;padding:0;">
              <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;
                          overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);
                            padding:32px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800;">AssistWalk</h1>
                  <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">
                    Password Reset
                  </p>
                </div>
                <div style="padding:32px;">
                  <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">Hello %s,</h2>
                  <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">
                    Your password has been reset by an administrator.
                  </p>
                  <div style="background:#f8fafc;border:1px solid #e5e7eb;
                              border-radius:12px;padding:20px;margin-bottom:24px;">
                    <p style="font-size:11px;color:#9ca3af;margin:0 0 6px;
                               text-transform:uppercase;letter-spacing:0.05em;">
                      New temporary password
                    </p>
                    <p style="font-size:22px;font-weight:800;color:#dc2626;
                               margin:0;letter-spacing:2px;font-family:monospace;">%s</p>
                  </div>
                  <div style="text-align:center;">
                    <a href="%s/login" style="display:inline-block;background:#2563eb;
                       color:#fff;text-decoration:none;padding:14px 32px;
                       border-radius:10px;font-weight:700;font-size:15px;">
                      Sign in →
                    </a>
                  </div>
                </div>
              </div>
            </body></html>
            """.formatted(prenom, tempPassword, frontendUrl);
        sendHtml(user.getEmail(), "🔑 Your AssistWalk password has been reset", html);
    }

    // ── Password changed by admin notification ────────────────
    public void sendPasswordChangedByAdmin(User user) {
        String prenom = user.getPrenom() != null ? user.getPrenom() : "User";
        String html = """
            <!DOCTYPE html>
            <html><body style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;margin:0;padding:0;">
              <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;
                          overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                <div style="background:linear-gradient(135deg,#16a34a,#15803d);
                            padding:32px;text-align:center;">
                  <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800;">AssistWalk</h1>
                  <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">
                    Account Security
                  </p>
                </div>
                <div style="padding:32px;">
                  <h2 style="color:#111827;font-size:20px;margin:0 0 16px;">Hello %s,</h2>
                  <p style="color:#6b7280;font-size:14px;margin:0 0 24px;line-height:1.6;">
                    An administrator has changed your AssistWalk account password.
                    If you were not aware of this change, please contact your administrator.
                  </p>
                  <div style="text-align:center;">
                    <a href="%s/login" style="display:inline-block;background:#16a34a;
                       color:#fff;text-decoration:none;padding:14px 32px;
                       border-radius:10px;font-weight:700;font-size:15px;">
                      Sign in →
                    </a>
                  </div>
                </div>
              </div>
            </body></html>
            """.formatted(prenom, frontendUrl);
        sendHtml(user.getEmail(), "🔒 Your AssistWalk password has been changed", html);
    }

    // ── SOS alert email (companion fallback) ─────────────────
    public void sendSosAlertEmail(User companion, Alert alert) {
        String name     = companion.getPrenom() != null ? companion.getPrenom() : "Companion";
        String obstacle = alert.getObstacleType() != null ? alert.getObstacleType() : "Unknown";
        String time     = alert.getCreatedAt() != null
                          ? alert.getCreatedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"))
                          : "—";
        String latStr   = String.format("%.6f", alert.getLatitude());
        String lonStr   = String.format("%.6f", alert.getLongitude());
        String mapsUrl  = "https://www.google.com/maps?q=" + latStr + "," + lonStr;
        String dashboard = frontendUrl + "/dashboard";

        String html = """
            <!DOCTYPE html>
            <html><head><meta charset="UTF-8">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            </head>
            <body style="font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;margin:0;padding:0;">
              <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;
                          overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

                <!-- Header -->
                <div style="background:linear-gradient(135deg,#dc2626,#ea580c);
                            padding:32px 32px 28px;text-align:center;">
                  <div style="font-size:40px;margin-bottom:10px;line-height:1;">🚨</div>
                  <h1 style="color:#fff;margin:0;font-size:24px;font-weight:800;
                              letter-spacing:-0.5px;">SOS Alert</h1>
                  <p style="color:rgba(255,255,255,0.85);margin:6px 0 0;font-size:14px;">
                    Immediate action required
                  </p>
                </div>

                <!-- Body -->
                <div style="padding:32px;">
                  <h2 style="color:#111827;font-size:18px;font-weight:700;margin:0 0 6px;">
                    Hello %s,
                  </h2>
                  <p style="color:#6b7280;font-size:14px;margin:0 0 24px;line-height:1.65;">
                    One of your assigned users has triggered an SOS alert.
                    Please check their situation immediately.
                  </p>

                  <!-- Alert details -->
                  <div style="background:#fff7ed;border:1px solid #fed7aa;
                              border-radius:12px;padding:20px;margin-bottom:20px;">
                    <p style="font-size:11px;color:#ea580c;margin:0 0 14px;font-weight:700;
                               text-transform:uppercase;letter-spacing:0.06em;">Alert Details</p>
                    <table style="width:100%%;border-collapse:collapse;">
                      <tr>
                        <td style="padding:6px 0;vertical-align:top;width:140px;">
                          <p style="font-size:11px;color:#9ca3af;margin:0;
                                     text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">
                            Obstacle type
                          </p>
                        </td>
                        <td style="padding:6px 0;vertical-align:top;">
                          <p style="font-size:14px;font-weight:700;color:#111827;margin:0;">%s</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;vertical-align:top;">
                          <p style="font-size:11px;color:#9ca3af;margin:0;
                                     text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">
                            Date &amp; Time
                          </p>
                        </td>
                        <td style="padding:6px 0;vertical-align:top;">
                          <p style="font-size:14px;font-weight:700;color:#111827;margin:0;">%s</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;vertical-align:top;">
                          <p style="font-size:11px;color:#9ca3af;margin:0;
                                     text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">
                            Latitude
                          </p>
                        </td>
                        <td style="padding:6px 0;vertical-align:top;">
                          <p style="font-size:14px;font-weight:600;color:#374151;margin:0;">%s</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;vertical-align:top;">
                          <p style="font-size:11px;color:#9ca3af;margin:0;
                                     text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">
                            Longitude
                          </p>
                        </td>
                        <td style="padding:6px 0;vertical-align:top;">
                          <p style="font-size:14px;font-weight:600;color:#374151;margin:0;">%s</p>
                        </td>
                      </tr>
                    </table>
                  </div>

                  <!-- Google Maps link -->
                  <div style="background:#eff6ff;border:1px solid #bfdbfe;
                              border-radius:12px;padding:16px;margin-bottom:24px;text-align:center;">
                    <a href="%s"
                       style="color:#2563eb;font-weight:700;text-decoration:none;
                              font-size:14px;line-height:1.5;">
                      📍 Open Location in Google Maps
                    </a>
                  </div>

                  <!-- CTA -->
                  <div style="text-align:center;margin-bottom:28px;">
                    <a href="%s"
                       style="display:inline-block;background:#2563eb;color:#fff;
                              text-decoration:none;padding:14px 36px;border-radius:10px;
                              font-weight:700;font-size:15px;
                              box-shadow:0 4px 12px rgba(37,99,235,0.30);">
                      Open Dashboard →
                    </a>
                  </div>

                  <p style="font-size:12px;color:#9ca3af;text-align:center;
                             margin:0;line-height:1.6;">
                    You received this message because you are a registered
                    companion in the AssistWalk system.
                  </p>
                </div>

                <!-- Footer -->
                <div style="background:#f9fafb;padding:16px;text-align:center;
                            border-top:1px solid #e5e7eb;">
                  <p style="font-size:12px;color:#9ca3af;margin:0;">
                    © 2026 AssistWalk — All rights reserved
                  </p>
                </div>
              </div>
            </body></html>
            """.formatted(name, obstacle, time, latStr, lonStr, mapsUrl, dashboard);

        sendHtml(companion.getEmail(), "🚨 SOS Alert — Action Required", html);
    }

    // ── Helper interne ────────────────────────────────────────
    private void sendHtml(String to, String subject, String html) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, true, "UTF-8");
            helper.setFrom(fromEmail, "AssistWalk");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(msg);
            log.info("[EMAIL] Sent to {}: {}", to, subject);
        } catch (Exception e) {
            log.error("[EMAIL] Failed to send to {}: {}", to, e.getMessage());
        }
    }
}