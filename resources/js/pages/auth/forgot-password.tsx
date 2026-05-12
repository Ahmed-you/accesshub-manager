import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocale } from '@/hooks/use-locale';
import AuthLayout from '@/layouts/auth-layout';
import { Head, useForm } from '@inertiajs/react';
import { LoaderCircle, Mail } from 'lucide-react';
import { FormEventHandler } from 'react';

export default function ForgotPassword({ status }: { status?: string }) {
    const { t } = useLocale();
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit: FormEventHandler = (event) => {
        event.preventDefault();
        post(route('password.email'));
    };

    return (
        <AuthLayout title="Forgot password" description="Enter your admin email and we will send a reset code">
            <Head title="Forgot password" />

            {status && <div className="text-primary text-center text-sm font-medium">{t(status)}</div>}

            <div className="border-border/80 bg-card/70 shadow-primary/5 rounded-2xl border p-5 shadow-xl">
                <div className="flex items-start gap-3">
                    <div className="bg-primary/15 text-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-full">
                        <Mail className="h-5 w-5" />
                    </div>
                    <p className="text-muted-foreground text-sm leading-6">
                        {t('We will send a 6-digit code so you can choose a new password.')}
                    </p>
                </div>
            </div>

            <form onSubmit={submit} className="space-y-6">
                <div className="grid gap-2">
                    <Label htmlFor="email">{t('Email address')}</Label>
                    <Input
                        id="email"
                        type="email"
                        name="email"
                        autoComplete="email"
                        value={data.email}
                        autoFocus
                        onChange={(event) => setData('email', event.target.value)}
                        placeholder="admin@example.com"
                    />
                    <InputError message={errors.email} />
                </div>

                <Button className="w-full" disabled={processing}>
                    {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    {t('Send password reset code')}
                </Button>
            </form>

            <div className="text-muted-foreground space-x-1 text-center text-sm">
                <span>{t('Or, return to')}</span>
                <TextLink href={route('login')}>{t('log in')}</TextLink>
            </div>
        </AuthLayout>
    );
}
