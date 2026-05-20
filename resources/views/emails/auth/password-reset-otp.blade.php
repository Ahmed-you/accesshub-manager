<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>AccessHub password reset code</title>
</head>
<body style="margin:0;background:#07111f;color:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
    <div style="padding:32px 16px;background:linear-gradient(135deg,#07111f 0%,#0b1726 52%,#062821 100%);">
        <div style="max-width:560px;margin:0 auto;border:1px solid #1f3346;border-radius:24px;overflow:hidden;background:#0d1724;box-shadow:0 24px 70px rgba(0,0,0,.35);">
            <div style="padding:28px 28px 20px;border-bottom:1px solid #1f3346;">
                <div style="display:flex;align-items:center;gap:14px;">
                    @php
                        $logoPath = base_path('image.png');
                        $logoSrc = null;
                        $shouldEmbedLogo = $embedLogo ?? true;

                        if ($shouldEmbedLogo && file_exists($logoPath)) {
                            $logoSrc = isset($message)
                                ? $message->embed($logoPath)
                                : 'data:image/png;base64,'.base64_encode(file_get_contents($logoPath));
                        }
                    @endphp

                    @if ($logoSrc)
                        <img src="{{ $logoSrc }}" alt="AccessHub" width="64" height="64" style="display:block;width:64px;height:64px;border-radius:999px;border:1px solid #24445d;object-fit:cover;">
                    @endif
                    <div>
                        <div style="font-size:22px;font-weight:700;letter-spacing:.2px;">
                            <span style="color:#f8fafc;">Access</span><span style="color:#7ee042;">Hub</span>
                        </div>
                        <div style="margin-top:3px;color:#9fb3c8;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Manager</div>
                    </div>
                </div>
            </div>

            <div style="padding:30px 28px;">
                <p style="margin:0 0 10px;color:#9fb3c8;font-size:14px;">Hello {{ $user->name }},</p>
                <h1 style="margin:0;color:#f8fafc;font-size:28px;line-height:1.2;">Reset your password</h1>
                <p style="margin:14px 0 24px;color:#b8c8da;font-size:15px;line-height:1.7;">
                    Use this one-time code to choose a new AccessHub Manager password.
                    It expires in {{ $expiresInMinutes }} minutes.
                </p>

                <div style="margin:0 0 24px;padding:22px;border:1px solid #1f3346;border-radius:18px;background:#07111f;text-align:center;">
                    <div style="color:#9fb3c8;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Password reset code</div>
                    <div style="margin-top:10px;color:#22d66f;font-size:42px;font-weight:800;letter-spacing:10px;">{{ $code }}</div>
                </div>

                <p style="margin:0;color:#9fb3c8;font-size:13px;line-height:1.7;">
                    If you did not request this password reset, ignore this email.
                    Your current password will stay unchanged.
                </p>
            </div>

            <div style="padding:18px 28px;border-top:1px solid #1f3346;background:#0a1420;color:#6f849b;font-size:12px;">
                AccessHub Manager security email
            </div>
        </div>
    </div>
</body>
</html>
