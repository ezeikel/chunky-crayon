'use client';

import { useEffect, useState, useTransition } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { requestEmailChange } from '@/app/actions/settings';

type EmailSettingsProps = {
  currentEmail: string | null;
};

const EmailSettings = ({ currentEmail }: EmailSettingsProps) => {
  const [newEmail, setNewEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();
  const searchParams = useSearchParams();

  // Surface the verify-route redirect result as a toast (the route bounces
  // back to /account/settings?status=email-changed|email-change-failed).
  useEffect(() => {
    const status = searchParams.get('status');
    if (status === 'email-changed') {
      toast.success('Your email has been updated.');
    } else if (status === 'email-change-failed') {
      toast.error(
        'That confirmation link was invalid or expired. Please try again.',
      );
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      const result = await requestEmailChange(newEmail);

      if (result.error) {
        toast.error(result.error);
      } else {
        setSent(true);
        setNewEmail('');
        toast.success('Check your new email for a link to confirm the change.');
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Account email</span>
        </CardTitle>
        <CardDescription>
          {currentEmail
            ? `Your account email is ${currentEmail}. We will send a confirmation link to any new address before changing it.`
            : 'We will send a confirmation link to any new address before changing it.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sent ? (
          <p className="text-sm text-muted-foreground">
            We have sent a confirmation link to your new email. Click it within
            30 minutes to finish the change. Nothing changes until you confirm.
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <input
              type="email"
              required
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="new@email.com"
              className="flex-1 rounded-full border border-input px-4 py-3 text-sm"
              disabled={isPending}
            />
            <Button type="submit" disabled={isPending || !newEmail}>
              {isPending ? 'Sending...' : 'Change email'}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
};

export default EmailSettings;
