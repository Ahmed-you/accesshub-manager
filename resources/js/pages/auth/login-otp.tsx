import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/hooks/use-locale';
import AuthLayout from '@/layouts/auth-layout';
import { Head, Link, useForm } from '@inertiajs/react';
import { LoaderCircle, MailCheck, RotateCcw } from 'lucide-react';
import { FormEventHandler } from 'react';

interface LoginOtpProps {
    email: string;
    status?: string;
}

export default function LoginOtp({ email, status }: LoginOtpProps) {
    const { t } = useLocale();
    const verifyForm = useForm({ code: '' });
    const resendForm = useForm({});

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        verifyForm.post(route('login.otp.verify'), {
            preserveScroll: true,
            onSuccess: () => verifyForm.reset('code'),
        });
    };

    const resend = () => {
        resendForm.post(route('login.otp.resend'), {
            preserveScroll: true,
        });
    };

    return (
        <AuthLayout title="Verify login code" description="Enter the 6-digit code sent to your admin email">
            <Head title="Verify login code" />

            <div className="border-border/80 bg-card/70 shadow-primary/5 rounded-2xl border p-5 shadow-xl">
                <div className="flex items-start gap-3">
                    <div className="bg-primary/15 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
                        <MailCheck className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-foreground font-semibold">{t('Check your email')}</p>
                        <p className="text-muted-foreground text-sm">
                            {t('We sent a login code to')} <span className="text-foreground font-medium">{email}</span>
                        </p>
                    </div>
                </div>
            </div>

            {status && <div className="text-primary text-center text-sm font-medium">{t(status)}</div>}

            <form className="flex flex-col gap-6" onSubmit={submit}>
                <div className="grid gap-2">
                    <Label htmlFor="code">{t('Verification code')}</Label>
                    <Input
                        id="code"
                        type="text"
                        inputMode="numeric"
                        required
                        autoFocus
                        autoComplete="one-time-code"
                        maxLength={6}
                        value={verifyForm.data.code}
                        onChange={(event) => verifyForm.setData('code', event.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        className="text-center text-2xl font-semibold tracking-[0.45em]"
                    />
                    <InputError message={verifyForm.errors.code} />
                </div>

                <Button type="submit" className="w-full" disabled={verifyForm.processing}>
                    {verifyForm.processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    {t('Verify and log in')}
                </Button>
            </form>

            <div className="flex flex-col gap-3 text-center text-sm">
                <Button type="button" variant="ghost" onClick={resend} disabled={resendForm.processing}>
                    {resendForm.processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    {t('Send a new code')}
                </Button>
                <Link href={route('login')} className="text-muted-foreground hover:text-foreground">
                    {t('Back to login')}
                </Link>
            </div>
        </AuthLayout>
    );
}
