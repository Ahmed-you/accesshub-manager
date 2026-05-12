import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/hooks/use-locale';
import AuthLayout from '@/layouts/auth-layout';
import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, RotateCcw } from 'lucide-react';
import { FormEventHandler } from 'react';

interface ResetPasswordProps {
    email: string;
    status?: string;
}

interface ResetPasswordForm {
    code: string;
    password: string;
    password_confirmation: string;
}

export default function ResetPassword({ email, status }: ResetPasswordProps) {
    const { t } = useLocale();
    const resetForm = useForm<ResetPasswordForm>({
        code: '',
        password: '',
        password_confirmation: '',
    });
    const resendForm = useForm({});

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        resetForm.post(route('password.store'), {
            onFinish: () => resetForm.reset('password', 'password_confirmation'),
        });
    };

    const resend = () => {
        resendForm.post(route('password.resend'), {
            preserveScroll: true,
        });
    };

    return (
        <AuthLayout title="Reset password" description="Enter the email code and choose your new password">
            <Head title="Reset password" />

            {status && <div className="text-primary text-center text-sm font-medium">{t(status)}</div>}

            <div className="border-border/80 bg-card/70 rounded-2xl border p-4 text-center">
                <p className="text-muted-foreground text-sm">
                    {t('Reset code sent to')} <span className="text-foreground font-medium">{email}</span>
                </p>
            </div>

            <form onSubmit={submit}>
                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="code">{t('Verification code')}</Label>
                        <Input
                            id="code"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            value={resetForm.data.code}
                            autoFocus
                            onChange={(event) => resetForm.setData('code', event.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="123456"
                            className="text-center text-2xl font-semibold tracking-[0.45em]"
                        />
                        <InputError message={resetForm.errors.code} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">{t('New password')}</Label>
                        <Input
                            id="password"
                            type="password"
                            name="password"
                            autoComplete="new-password"
                            value={resetForm.data.password}
                            onChange={(event) => resetForm.setData('password', event.target.value)}
                            placeholder={t('New password')}
                        />
                        <InputError message={resetForm.errors.password} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password_confirmation">{t('Confirm password')}</Label>
                        <Input
                            id="password_confirmation"
                            type="password"
                            name="password_confirmation"
                            autoComplete="new-password"
                            value={resetForm.data.password_confirmation}
                            onChange={(event) => resetForm.setData('password_confirmation', event.target.value)}
                            placeholder={t('Confirm password')}
                        />
                        <InputError message={resetForm.errors.password_confirmation} />
                    </div>

                    <Button type="submit" className="w-full" disabled={resetForm.processing}>
                        {resetForm.processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                        {t('Reset password')}
                    </Button>
                </div>
            </form>

            <Button type="button" variant="ghost" onClick={resend} disabled={resendForm.processing}>
                {resendForm.processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                {t('Send a new code')}
            </Button>
        </AuthLayout>
    );
}
